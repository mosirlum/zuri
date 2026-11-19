import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { logActivity } from "@/lib/activity";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Whether a car is out today is a fact about the bookings, so it's worked
    // out here rather than kept in step by hand on the fleet page. Only
    // maintenance is ever set by a person.
    const vehicles = await sql`
      SELECT v.*,
        (
          SELECT b.pickup_datetime
          FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.vehicle_id = v.id
            AND b.status <> 'cancelled'
            AND b.pickup_datetime > NOW()
          ORDER BY b.pickup_datetime ASC
          LIMIT 1
        ) AS next_booking,
        (
          SELECT b.booking_ref
          FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.vehicle_id = v.id
            AND b.status <> 'cancelled'
            AND b.pickup_datetime > NOW()
          ORDER BY b.pickup_datetime ASC
          LIMIT 1
        ) AS next_booking_ref,
        (
          SELECT b.booking_ref
          FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.vehicle_id = v.id
            AND b.status <> 'cancelled'
            AND b.pickup_datetime IS NOT NULL
            AND b.pickup_datetime <= NOW()
            AND (
              COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime + INTERVAL '1 day') >= NOW()
            )
          ORDER BY b.pickup_datetime DESC
          LIMIT 1
        ) AS busy_on
      FROM vehicles v
      ORDER BY v.make, v.model
    `;

    const withStatus = vehicles.map((v: any) => ({
      ...v,
      status: v.status === "maintenance" ? "maintenance"
        : v.busy_on ? "on_hire"
        : v.next_booking ? "booked"
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
    const result = await sql`
      INSERT INTO vehicles (
        make, model, year, plate_number, category, seats,
        fuel_type, transmission, color, status,
        insurance_expiry, operating_licence_expiry, registration_expiry,
        road_worthiness_expiry, tra_sticker_expiry,
        last_service_date, next_service_date, service_notes,
        notes
      ) VALUES (
        ${body.make}, ${body.model}, ${body.year || null},
        ${body.plate_number || null}, ${body.category},
        ${body.seats || null}, ${body.fuel_type || "Diesel"},
        ${body.transmission || "Automatic"}, ${body.color || null},
        ${body.status === "maintenance" ? "maintenance" : "available"},
        ${body.insurance_expiry || null},
        ${body.operating_licence_expiry || null},
        ${body.registration_expiry || null},
        ${body.road_worthiness_expiry || null},
        ${body.tra_sticker_expiry || null},
        ${body.last_service_date || null},
        ${body.next_service_date || null},
        ${body.service_notes || null},
        ${body.notes || null}
      ) RETURNING *
    `;
    await logActivity(session, "Vehicle added", `${result[0].make} ${result[0].model} ${result[0].plate_number || ""}`);
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
    const result = await sql`
      UPDATE vehicles SET
        make = ${body.make}, model = ${body.model},
        year = ${body.year || null}, plate_number = ${body.plate_number || null},
        category = ${body.category}, seats = ${body.seats || null},
        color = ${body.color || null}, status = ${body.status === "maintenance" ? "maintenance" : "available"},
        insurance_expiry = ${body.insurance_expiry || null},
        operating_licence_expiry = ${body.operating_licence_expiry || null},
        registration_expiry = ${body.registration_expiry || null},
        road_worthiness_expiry = ${body.road_worthiness_expiry || null},
        tra_sticker_expiry = ${body.tra_sticker_expiry || null},
        last_service_date = ${body.last_service_date || null},
        next_service_date = ${body.next_service_date || null},
        service_notes = ${body.service_notes || null},
        notes = ${body.notes || null},
        updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING *
    `;
    await logActivity(session, "Vehicle edited", `${result[0].make} ${result[0].model} ${result[0].plate_number || ""}`);
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

