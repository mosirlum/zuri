import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireSession, requireBoss, isGuardFailure } from "@/lib/guards";
import { toId } from "@/lib/validate";
import { logError } from "@/lib/error-log";
import { logActivity } from "@/lib/activity";

const sql = neon(process.env.DATABASE_URL!);

// Only human decisions are stored. Anything else (on hire, overdue...) is derived.
const ALLOWED = ["confirmed", "completed", "cancelled"];

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = toId(body?.id);
    const status = String(body?.status || "");
    if (!id || !ALLOWED.includes(status)) {
      return NextResponse.json({ error: "Invalid booking or status" }, { status: 400 });
    }

    // Staff may cancel; reopening or completing by hand is Ray's call.
    const guard = status === "cancelled" ? await requireSession() : await requireBoss();
    if (isGuardFailure(guard)) return guard.response;

    const result = await sql`
      UPDATE bookings SET status = ${status}, updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    if (result.length === 0) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    await logActivity(guard.session, "Booking status", `${result[0].booking_ref} → ${status}`);
    return NextResponse.json(result[0]);
  } catch (err) {
    await logError("bookings/status", err);
    return NextResponse.json({ error: "Could not update status" }, { status: 500 });
  }
}
