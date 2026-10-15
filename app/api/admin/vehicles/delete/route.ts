import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireBoss, isGuardFailure } from "@/lib/guards";
import { toId } from "@/lib/validate";
import { logError } from "@/lib/error-log";

const sql = neon(process.env.DATABASE_URL!);

export async function DELETE(req: NextRequest) {
  const guard = await requireBoss();
  if (isGuardFailure(guard)) return guard.response;

  try {
    const body = await req.json();
    const id = toId(body?.id);
    if (!id) return NextResponse.json({ error: "Missing vehicle id" }, { status: 400 });

    // A car with trip history can't be deleted — it would erase what those
    // trips earned and cost. Counts both single-car and multi-car bookings.
    const rows = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM bookings WHERE vehicle_id = ${id}) +
        (SELECT COUNT(*)::int FROM booking_vehicles WHERE vehicle_id = ${id}) AS count
    `;
    const count = rows[0]?.count || 0;
    if (count > 0) {
      return NextResponse.json({
        error: "has_history",
        count,
        message: `This vehicle is linked to ${count} booking${count === 1 ? "" : "s"}. Deleting it would erase that trip history.`,
      }, { status: 409 });
    }

    const result = await sql`DELETE FROM vehicles WHERE id = ${id} RETURNING id`;
    if (result.length === 0) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    await logError("vehicles/delete", err);
    return NextResponse.json({ error: "Could not delete vehicle" }, { status: 500 });
  }
}
