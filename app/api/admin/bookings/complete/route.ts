import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Records the invoice AND all trip costs in one step, matching how Ray works:
// car returns, he writes the invoice, and enters everything at once — including
// what he owes the owner of a borrowed car, which is only settled at that point.
// Status stays 'confirmed' until payment is received (see /bookings/payment).
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      id, invoice_number, invoice_date, paid_amount, km_travelled,
      fuel_cost, driver_allowance, emergency_cost,
      emergency_notes, trip_notes,
      borrowed_payout_type, borrowed_payout_percent, borrowed_payout_fixed
    } = body;

    if (!invoice_number || !invoice_date) {
      return NextResponse.json({ error: "Invoice number and date are required" }, { status: 400 });
    }

    const fuelAmt = parseFloat(fuel_cost) || 0;
    const allowanceAmt = parseFloat(driver_allowance) || 0;
    const emergencyAmt = parseFloat(emergency_cost) || 0;
    const tripAmount = parseFloat(paid_amount) || 0;
    const totalTripCost = fuelAmt + allowanceAmt + emergencyAmt;

    const bookingRow = await sql`
      SELECT is_borrowed_vehicle, borrowed_owner_name FROM bookings WHERE id = ${id} LIMIT 1
    `;
    const bk = bookingRow[0];

    // Work out what goes back to the owner of a borrowed car — either an agreed
    // flat amount or a percentage of the invoice, whichever was settled.
    let ownerPayout = 0;
    let payoutType: string | null = null;
    let payoutPercent: number | null = null;
    let payoutFixed: number | null = null;

    if (bk?.is_borrowed_vehicle) {
      payoutType = borrowed_payout_type || "fixed";
      if (payoutType === "percent") {
        payoutPercent = parseFloat(borrowed_payout_percent) || 0;
        ownerPayout = tripAmount * (payoutPercent / 100);
      } else {
        payoutFixed = parseFloat(borrowed_payout_fixed) || 0;
        ownerPayout = payoutFixed;
      }
    }

    const result = await sql`
      UPDATE bookings SET
        invoice_number = ${invoice_number},
        invoice_date = ${invoice_date},
        payment_status = 'unpaid',
        paid_amount = ${tripAmount},
        km_travelled = ${parseFloat(km_travelled) || null},
        trip_cost = ${totalTripCost},
        borrowed_payout_type = ${payoutType},
        borrowed_payout_percent = ${payoutPercent},
        borrowed_payout_fixed = ${payoutFixed},
        owner_payout_amount = ${ownerPayout || null},
        emergency_cost = ${emergencyAmt},
        emergency_notes = ${emergency_notes || null},
        trip_notes = ${trip_notes || null},
        updated_at = NOW()
      WHERE id = ${id} AND status = 'confirmed'
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Booking not found or already completed" }, { status: 404 });
    }

    const booking = result[0];

    // Replace any previously-logged trip expenses (in case Ray is correcting
    // the invoice before payment) then insert fresh ones.
    await sql`DELETE FROM expenses WHERE booking_id = ${id} AND expense_type = 'trip'`;

    if (fuelAmt > 0) {
      await sql`
        INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
        VALUES ('fuel', ${'Fuel — ' + booking.booking_ref}, ${fuelAmt}, 'TZS', CURRENT_DATE, ${id}, 'trip')
      `;
    }

    if (allowanceAmt > 0) {
      await sql`
        INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
        VALUES ('driver_salary', ${'Driver allowance — ' + booking.booking_ref}, ${allowanceAmt}, 'TZS', CURRENT_DATE, ${id}, 'trip')
      `;
    }

    if (emergencyAmt > 0) {
      await sql`
        INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
        VALUES ('other', ${emergency_notes ? 'Emergency — ' + emergency_notes : 'Emergency — ' + booking.booking_ref}, ${emergencyAmt}, 'TZS', CURRENT_DATE, ${id}, 'trip')
      `;
    }

    if (ownerPayout > 0) {
      const ownerLabel = bk.borrowed_owner_name ? ` (${bk.borrowed_owner_name})` : "";
      await sql`
        INSERT INTO expenses (category, description, amount, currency, expense_date, booking_id, expense_type)
        VALUES ('other', ${'Borrowed vehicle payout' + ownerLabel + ' — ' + booking.booking_ref}, ${ownerPayout}, 'TZS', CURRENT_DATE, ${id}, 'trip')
      `;
    }

    return NextResponse.json(booking);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

