import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireBoss, isGuardFailure } from "@/lib/guards";
import { toId } from "@/lib/validate";
import { logError } from "@/lib/error-log";
import { logActivity } from "@/lib/activity";

const sql = neon(process.env.DATABASE_URL!);

// Deleting a booking erases its money trail, so only Ray can do it, and every
// related row goes in one transaction — it either all goes or nothing does.
export async function DELETE(req: NextRequest) {
  const guard = await requireBoss();
  if (isGuardFailure(guard)) return guard.response;

  try {
    const body = await req.json();
    const id = toId(body?.id);
    if (!id) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });

    await sql.transaction([
      sql`DELETE FROM expenses WHERE booking_id = ${id}`,
      sql`DELETE FROM trip_assignments WHERE booking_id = ${id}`,
      sql`DELETE FROM booking_vehicles WHERE booking_id = ${id}`,
      sql`DELETE FROM bookings WHERE id = ${id}`,
    ]);

    await logActivity(guard.session, "Booking deleted", `Booking #${id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    await logError("bookings/delete", err);
    return NextResponse.json({ error: "Could not delete. Nothing was changed." }, { status: 500 });
  }
}
