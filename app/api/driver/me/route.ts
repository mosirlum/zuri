import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const drivers = await sql`
      SELECT * FROM drivers WHERE user_id = ${userId} LIMIT 1
    `;
    const driver = drivers[0];

    if (!driver) {
      return NextResponse.json({ driver: null, assignments: [] });
    }

    const assignments = await sql`
      SELECT
        ta.*,
        b.booking_ref, b.service_type, b.pickup_location, b.pickup_region,
        b.dropoff_location, b.dropoff_region, b.pickup_datetime, b.travel_details, b.notes,
        c.full_name as customer_name, c.phone as customer_phone,
        v.make as vehicle_make, v.model as vehicle_model, v.plate_number
      FROM trip_assignments ta
      JOIN bookings b ON ta.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN vehicles v ON ta.vehicle_id = v.id
      WHERE ta.driver_id = ${driver.id}
      AND ta.completed_at IS NULL
      ORDER BY b.pickup_datetime ASC
    `;

    return NextResponse.json({ driver, assignments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// A driver can update ONLY their own document fields — never assignments,
// status, uniform compliance, or anyone else's record.
export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    const drivers = await sql`SELECT id FROM drivers WHERE user_id = ${userId} LIMIT 1`;
    const driver = drivers[0];
    if (!driver) return NextResponse.json({ error: "No driver record found" }, { status: 404 });

    const result = await sql`
      UPDATE drivers SET
        license_number = ${body.license_number || null},
        license_expiry = ${body.license_expiry || null},
        psv_badge_number = ${body.psv_badge_number || null},
        psv_badge_expiry = ${body.psv_badge_expiry || null},
        good_conduct_expiry = ${body.good_conduct_expiry || null},
        updated_at = NOW()
      WHERE id = ${driver.id} AND user_id = ${userId}
      RETURNING *
    `;

    return NextResponse.json({ driver: result[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
