import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// The printed documents need details the operational booking doesn't carry —
// order numbers, price structure, EFD receipt, line items. They're kept as one
// JSON blob against the booking so both documents draw from the same source.
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });

    const result = await sql`
      UPDATE bookings SET
        document_data = ${JSON.stringify(body.document_data || {})}::jsonb,
        updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING id, document_data
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
