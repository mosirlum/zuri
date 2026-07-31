import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Records the invoice for the whole job, plus each vehicle's own costs.
// The customer gets one invoice no matter how many cars were used; the costs
// stay attached to the individual cars so per-vehicle reporting stays honest.
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, invoice_number, invoice_date, paid_amount, trip_notes } = body;

    if (!invoice_number || !invoice_date) {
      return NextResponse.json({ error: "Invoice number and date are required" }, { status: 400 });
    }

    const tripAmount = parseFloat(paid_amount) || 0;
    const rows = Array.isArray(body.vehicles) ? body.vehicles : [];

    let totalTripCost = 0;
    let totalOwnerPayout = 0;
    let totalEmergency = 0;
    const emergencyNotes: string[] = [];

    // Each row carries one vehicle's numbers. A borrowed car's payout is
    // settled here too — either a flat agreed amount or a share of the invoice.
    const computed = rows.map((v: any) => {
      const fuel = parseFloat(v.fuel_cost) || 0;
      const allowance = parseFloat(v.driver_allowance) || 0;
      const emergency = parseFloat(v.emergency_cost) || 0;

      let payout = 0;
      let payoutType: string | null = null;
      let payoutPercent: number | null = null;
      let payoutFixed: number | null = null;

      if (v.is_borrowed) {
        payoutType = v.borrowed_payout_type || "fixed";
        if (payoutType === "percent") {
          payoutPercent = parseFloat(v.borrowed_payout_percent) || 0;
          // A percentage is taken against this vehicle's share of the invoice,
          // so two borrowed cars on one job don't each claim the whole amount.
          const share = rows.length > 0 ? tripAmount / rows.length : tripAmount;
          payout = share * (payoutPercent / 100);
        } else {
          payoutFixed = parseFloat(v.borrowed_payout_fixed) || 0;
          payout = payoutFixed;
        }
      }

      totalTripCost += fuel + allowance + emergency;
      totalOwnerPayout += payout;
      totalEmergency += emergency;
      if (emergency > 0 && v.emergency_notes) emergencyNotes.push(v.emergency_notes);

      return { ...v, fuel, allowance, emergency, payout, payoutType, payoutPercent, payoutFixed };
    });

    const result = await sql`
      UPDATE bookings SET
        invoice_number = ${invoice_number},
        invoice_date = ${invoice_date},
        payment_status = 'unpaid',
        paid_amount = ${tripAmount},
        trip_cost = ${totalTripCost},
        owner_payout_amount = ${totalOwnerPayout || null},
        emergency_cost = ${totalEmergency},
        emergency_notes = ${emergencyNotes.length ? emergencyNotes.join(" · ") : null},
        trip_notes = ${trip_notes || null},
        updated_at = NOW()
      WHERE id = ${id} AND status = 'confirmed'
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Booking not found or already completed" }, { status: 404 });
    }
    const booking = result[0];

    for (const v of computed) {
      if (!v.id) continue;
      await sql`
        UPDATE booking_vehicles SET
          km_travelled = ${v.km_travelled ? parseFloat(v.km_travelled) : null},
          fuel_cost = ${v.fuel},
          driver_allowance = ${v.allowance},
          emergency_cost = ${v.emergency},
          emergency_notes = ${v.emergency_notes || null},
          borrowed_payout_type = ${v.payoutType},
          borrowed_payout_percent = ${v.payoutPercent},
          borrowed_payout_fixed = ${v.payoutFixed},
          owner_payout_amount = ${v.payout || null},
          updated_at = NOW()
        WHERE id = ${v.id} AND booking_id = ${id}
      `;
    }

    // Rebuild this booking's trip expenses from scratch so corrections before
    // payment don't leave stale rows behind.
    await sql`DELETE FROM expenses WHERE booking_id = ${id} AND expense_type = 'trip'`;

    for (const v of computed) {
      const label = v.is_borrowed
        ? (v.borrowed_vehicle_desc || "Borrowed vehicle")
        : [v.vehicle_make, v.vehicle_model].filter(Boolean).join(" ") || "Vehicle";
      const tag = `${booking.booking_ref} · ${label}`;

      if (v.fuel > 0) {
        await sql`
          INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
          VALUES ('fuel', ${'Fuel — ' + tag}, ${v.fuel}, 'TZS', CURRENT_DATE, ${id}, 'trip')
        `;
      }
      if (v.allowance > 0) {
        await sql`
          INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
          VALUES ('driver_salary', ${'Driver allowance — ' + tag}, ${v.allowance}, 'TZS', CURRENT_DATE, ${id}, 'trip')
        `;
      }
      if (v.emergency > 0) {
        const note = v.emergency_notes ? `Emergency (${v.emergency_notes}) — ${tag}` : `Emergency — ${tag}`;
        await sql`
          INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
          VALUES ('other', ${note}, ${v.emergency}, 'TZS', CURRENT_DATE, ${id}, 'trip')
        `;
      }
      if (v.payout > 0) {
        const owner = v.borrowed_owner_name ? ` (${v.borrowed_owner_name})` : "";
        await sql`
          INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
          VALUES ('other', ${'Borrowed vehicle payout' + owner + ' — ' + tag}, ${v.payout}, 'TZS', CURRENT_DATE, ${id}, 'trip')
        `;
      }
    }

    return NextResponse.json(booking);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
