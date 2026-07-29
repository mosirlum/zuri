import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing vehicle id" }, { status: 400 });

    // A vehicle with trip history can't be deleted — removing it would wipe the
    // record of what those trips earned and cost, and break per-vehicle reports.
    const bookingCount = await sql`
      SELECT COUNT(*)::int as count FROM bookings WHERE vehicle_id = ${body.id}
    `;
    const count = bookingCount[0]?.count || 0;

    if (count > 0) {
      return NextResponse.json({
        error: "has_history",
        count,
        message: `This vehicle is linked to ${count} booking${count === 1 ? "" : "s"}. Deleting it would erase that trip history.`,
      }, { status: 409 });
    }

    const result = await sql`DELETE FROM vehicles WHERE id = ${body.id} RETURNING id`;
    if (result.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

