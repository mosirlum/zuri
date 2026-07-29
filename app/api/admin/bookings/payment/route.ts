import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.id || !body.payment_received_date) {
      return NextResponse.json({ error: "Payment received date is required" }, { status: 400 });
    }

    const result = await sql`
      UPDATE bookings SET
        status = 'completed',
        payment_status = 'paid',
        payment_method = ${body.payment_method || 'cash'},
        payment_received_date = ${body.payment_received_date},
        updated_at = NOW()
      WHERE id = ${body.id} AND status = 'confirmed' AND invoice_number IS NOT NULL
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Booking must be invoiced before it can be marked as paid" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
