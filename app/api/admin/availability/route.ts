import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// A car is out from pickup until it comes back. Where no return was recorded
// we fall back to the drop-off, and failing that we assume the same day.
const BUSY_WINDOW = `
  b.pickup_datetime,
  COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime)
`;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const exclude = searchParams.get("exclude");

  // With no window given, answer for right now — that's what the fleet and
  // driver lists need to show who is out at this moment.
  const start = from || new Date().toISOString();
  const end = to || from || new Date().toISOString();
  const excludeId = exclude ? parseInt(exclude) : -1;

  try {
    const rows = await sql`
      SELECT
        bv.vehicle_id,
        bv.driver_id,
        b.id as booking_id,
        b.booking_ref,
        b.pickup_datetime,
        COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime + interval '1 day') as ends_at
      FROM booking_vehicles bv
      JOIN bookings b ON b.id = bv.booking_id
      WHERE b.status <> 'cancelled'
        AND b.id <> ${excludeId}
        AND b.pickup_datetime IS NOT NULL
        AND b.pickup_datetime <= ${end}::timestamptz
        AND COALESCE(
              b.return_datetime,
              b.dropoff_datetime,
              b.pickup_datetime + interval '1 day'
            ) >= ${start}::timestamptz
    `;

    const vehicles: Record<string, any> = {};
    const drivers: Record<string, any> = {};

    rows.forEach((r: any) => {
      const info = { booking_id: r.booking_id, booking_ref: r.booking_ref, from: r.pickup_datetime, to: r.ends_at };
      if (r.vehicle_id) vehicles[r.vehicle_id] = info;
      if (r.driver_id) drivers[r.driver_id] = info;
    });

    return NextResponse.json({ vehicles, drivers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
