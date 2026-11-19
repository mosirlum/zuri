import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireBoss, isGuardFailure } from "@/lib/guards";
import { neon } from "@neondatabase/serverless";
import { logActivity } from "@/lib/activity";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Whether someone is out on a job is a fact about today's trips, not
    // something to be kept in step by hand. Only leave is set manually.
    const drivers = await sql`
      SELECT d.*,
        (
          SELECT b.pickup_datetime
          FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.driver_id = d.id
            AND b.status = 'confirmed'
            AND b.invoice_number IS NULL
            AND b.pickup_datetime > NOW()
          ORDER BY b.pickup_datetime ASC
          LIMIT 1
        ) AS next_booking,
        (
          SELECT b.booking_ref
          FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.driver_id = d.id
            AND b.status = 'confirmed'
            AND b.invoice_number IS NULL
            AND b.pickup_datetime > NOW()
          ORDER BY b.pickup_datetime ASC
          LIMIT 1
        ) AS next_booking_ref,
        EXISTS (
          SELECT 1
          FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.driver_id = d.id
            AND b.status = 'confirmed'
            AND b.invoice_number IS NULL
            AND b.pickup_datetime IS NOT NULL
            AND b.pickup_datetime <= NOW()
            AND (
              COALESCE(b.return_datetime, b.dropoff_datetime) IS NULL
              OR COALESCE(b.return_datetime, b.dropoff_datetime) >= NOW()
            )
        ) AS on_trip
      FROM drivers d
      ORDER BY d.full_name
    `;

    const withStatus = drivers.map((d: any) => ({
      ...d,
      status: d.status === "leave" ? "leave"
        : d.on_trip ? "on_duty"
        : d.next_booking ? "booked"
        : "available",
    }));

    return NextResponse.json(withStatus);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.full_name) {
      return NextResponse.json({ error: "Driver name is required" }, { status: 400 });
    }

    // Drivers don't log in — they're records the office keeps, nothing more.
    const result = await sql`
      INSERT INTO drivers (
        full_name, phone, email, status,
        license_number, license_class, license_expiry,
        psv_badge_number, psv_badge_expiry, good_conduct_expiry,
        emergency_contact_name, emergency_contact_phone,
        uniform_compliant, uniform_last_checked, uniform_notes, notes
      ) VALUES (
        ${body.full_name},
        ${body.phone || null},
        ${body.email || null},
        ${body.status === "leave" ? "leave" : "available"},
        ${body.license_number || null},
        ${body.license_class || null},
        ${body.license_expiry || null},
        ${body.psv_badge_number || null},
        ${body.psv_badge_expiry || null},
        ${body.good_conduct_expiry || null},
        ${body.emergency_contact_name || null},
        ${body.emergency_contact_phone || null},
        ${body.uniform_compliant || false},
        ${body.uniform_last_checked || null},
        ${body.uniform_notes || null},
        ${body.notes || null}
      ) RETURNING *
    `;
    await logActivity(session, "Driver added", `${result[0].full_name}`);
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Anything other than leave is worked out from the trips, so only that
    // one value is ever written back.
    const storedStatus = body.status === "leave" ? "leave" : "available";

    const result = await sql`
      UPDATE drivers SET
        full_name = ${body.full_name},
        phone = ${body.phone || null},
        email = ${body.email || null},
        status = ${storedStatus},
        license_number = ${body.license_number || null},
        license_class = ${body.license_class || null},
        license_expiry = ${body.license_expiry || null},
        psv_badge_number = ${body.psv_badge_number || null},
        psv_badge_expiry = ${body.psv_badge_expiry || null},
        good_conduct_expiry = ${body.good_conduct_expiry || null},
        emergency_contact_name = ${body.emergency_contact_name || null},
        emergency_contact_phone = ${body.emergency_contact_phone || null},
        uniform_compliant = ${body.uniform_compliant || false},
        uniform_last_checked = ${body.uniform_last_checked || null},
        uniform_notes = ${body.uniform_notes || null},
        notes = ${body.notes || null},
        updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING *
    `;
    await logActivity(session, "Driver edited", `${result[0].full_name}`);
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireBoss();
  if (isGuardFailure(guard)) return guard.response;

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing driver id" }, { status: 400 });

    // A driver who has worked trips can't be removed — their name is on those
    // records and the reports read from them.
    const counts = await sql`
      SELECT COUNT(*)::int as count FROM booking_vehicles WHERE driver_id = ${body.id}
    `;
    const count = counts[0]?.count || 0;

    if (count > 0) {
      return NextResponse.json({
        error: "has_history",
        count,
        message: `This driver is linked to ${count} trip record${count === 1 ? "" : "s"}.`,
      }, { status: 409 });
    }

    await sql`DELETE FROM drivers WHERE id = ${body.id}`;
    await logActivity(guard.session, "Driver deleted", `Driver #${body.id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
