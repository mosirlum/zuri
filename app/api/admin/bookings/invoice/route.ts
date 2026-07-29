import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.id || !body.invoice_number || !body.invoice_date) {
      return NextResponse.json({ error: "Invoice number and date are required" }, { status: 400 });
    }

    const result = await sql`
      UPDATE bookings SET
        invoice_number = ${body.invoice_number},
        invoice_date = ${body.invoice_date},
        updated_at = NOW()
      WHERE id = ${body.id} AND status = 'completed'
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Booking not found or not yet completed" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
