import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { toAmount, toOptionalAmount, toPercent, toText, toDate, toId } from "@/lib/validate";

const sql = neon(process.env.DATABASE_URL!);

// Records the invoice for the whole job, plus each vehicle's own costs.
// The customer gets one invoice no matter how many cars were used; the costs
// stay attached to the individual cars so per-vehicle reporting stays honest.
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let bookingIdForLog: number | undefined;

  try {
    const body = await req.json();
    bookingIdForLog = body?.id;

    const id = toId(body.id);
    const invoiceNumber = toText(body.invoice_number, 60);
    const invoiceDate = toDate(body.invoice_date);
    const tripNotes = toText(body.trip_notes, 2000);

    if (!id) return NextResponse.json({ error: "Missing booking" }, { status: 400 });
    if (!invoiceNumber || !invoiceDate) {
      return NextResponse.json({ error: "Invoice number and date are required" }, { status: 400 });
    }

    const tripAmount = toAmount(body.paid_amount);
    if (tripAmount <= 0) {
      return NextResponse.json({ error: "Invoice amount must be more than zero" }, { status: 400 });
    }

    const rows = Array.isArray(body.vehicles) ? body.vehicles : [];

    // Read what's needed before writing anything, so the whole write can go in
    // one shot below.
    const existing = await sql`
      SELECT id, booking_ref FROM bookings WHERE id = ${id} AND status = 'confirmed' LIMIT 1
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Booking not found or already completed" }, { status: 404 });
    }
    const bookingRef = existing[0].booking_ref;

    let totalTripCost = 0;
    let totalOwnerPayout = 0;
    let totalEmergency = 0;
    const emergencyNotes: string[] = [];

    // Each row carries one vehicle's numbers. A borrowed car's payout is
    // settled here too — either a flat agreed amount or a share of the invoice.
    const computed = rows.map((v: any) => {
      const fuel = toAmount(v.fuel_cost);
      const allowance = toAmount(v.driver_allowance);
      const emergency = toAmount(v.emergency_cost);

      let payout = 0;
      let payoutType: string | null = null;
      let payoutPercent: number | null = null;
      let payoutFixed: number | null = null;

      if (v.is_borrowed) {
        payoutType = v.borrowed_payout_type === "percent" ? "percent" : "fixed";
        if (payoutType === "percent") {
          payoutPercent = toPercent(v.borrowed_payout_percent);
          // A percentage is taken against this vehicle's share of the invoice,
          // so two borrowed cars on one job don't each claim the whole amount.
          const share = rows.length > 0 ? tripAmount / rows.length : tripAmount;
          payout = Math.round(share * (payoutPercent / 100) * 100) / 100;
        } else {
          payoutFixed = toAmount(v.borrowed_payout_fixed);
          payout = payoutFixed;
        }
      }

      const notes = toText(v.emergency_notes, 300);
      totalTripCost += fuel + allowance + emergency;
      totalOwnerPayout += payout;
      totalEmergency += emergency;
      if (emergency > 0 && notes) emergencyNotes.push(notes);

      return {
        rowId: toId(v.id),
        km: toOptionalAmount(v.km_travelled),
        fuel, allowance, emergency,
        notes,
        payout, payoutType, payoutPercent, payoutFixed,
        isBorrowed: !!v.is_borrowed,
        label: v.is_borrowed
          ? (toText(v.borrowed_vehicle_desc, 120) || "Borrowed vehicle")
          : [v.vehicle_make, v.vehicle_model].filter(Boolean).join(" ") || "Vehicle",
        ownerName: toText(v.borrowed_owner_name, 120),
      };
    });

    // Everything below lands together or not at all. Half of it landing would
    // leave a booking marked as invoiced with none of its costs recorded, and
    // the profit figures would be wrong with nothing to show it.
    const writes: any[] = [];

    writes.push(sql`
      UPDATE bookings SET
        invoice_number = ${invoiceNumber},
        invoice_date = ${invoiceDate},
        payment_status = 'unpaid',
        paid_amount = ${tripAmount},
        trip_cost = ${totalTripCost},
        owner_payout_amount = ${totalOwnerPayout || null},
        emergency_cost = ${totalEmergency},
        emergency_notes = ${emergencyNotes.length ? emergencyNotes.join(" · ") : null},
        trip_notes = ${tripNotes},
        updated_at = NOW()
      WHERE id = ${id} AND status = 'confirmed'
    `);

    for (const v of computed) {
      if (!v.rowId) continue;
      writes.push(sql`
        UPDATE booking_vehicles SET
          km_travelled = ${v.km},
          fuel_cost = ${v.fuel},
          driver_allowance = ${v.allowance},
          emergency_cost = ${v.emergency},
          emergency_notes = ${v.notes},
          borrowed_payout_type = ${v.payoutType},
          borrowed_payout_percent = ${v.payoutPercent},
          borrowed_payout_fixed = ${v.payoutFixed},
          owner_payout_amount = ${v.payout || null},
          updated_at = NOW()
        WHERE id = ${v.rowId} AND booking_id = ${id}
      `);
    }

    // Rebuild this booking's trip expenses from scratch so corrections before
    // payment don't leave stale rows behind.
    writes.push(sql`DELETE FROM expenses WHERE booking_id = ${id} AND expense_type = 'trip'`);

    for (const v of computed) {
      const tag = `${bookingRef} · ${v.label}`;

      if (v.fuel > 0) {
        writes.push(sql`
          INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
          VALUES ('fuel', ${'Fuel — ' + tag}, ${v.fuel}, 'TZS', CURRENT_DATE, ${id}, 'trip')
        `);
      }
      if (v.allowance > 0) {
        writes.push(sql`
          INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
          VALUES ('driver_salary', ${'Driver allowance — ' + tag}, ${v.allowance}, 'TZS', CURRENT_DATE, ${id}, 'trip')
        `);
      }
      if (v.emergency > 0) {
        const note = v.notes ? `Emergency (${v.notes}) — ${tag}` : `Emergency — ${tag}`;
        writes.push(sql`
          INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
          VALUES ('other', ${note}, ${v.emergency}, 'TZS', CURRENT_DATE, ${id}, 'trip')
        `);
      }
      if (v.payout > 0) {
        const owner = v.ownerName ? ` (${v.ownerName})` : "";
        writes.push(sql`
          INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
          VALUES ('other', ${'Borrowed vehicle payout' + owner + ' — ' + tag}, ${v.payout}, 'TZS', CURRENT_DATE, ${id}, 'trip')
        `);
      }
    }

    await sql.transaction(writes);

    const updated = await sql`SELECT * FROM bookings WHERE id = ${id} LIMIT 1`;
    return NextResponse.json(updated[0]);
  } catch (err) {
    const { logError } = await import("@/lib/error-log");
    await logError("bookings/complete", err, { bookingId: bookingIdForLog });
    return NextResponse.json({ error: "Could not save the invoice. Nothing was changed." }, { status: 500 });
  }
}
