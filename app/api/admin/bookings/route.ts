import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const bookings = await sql`
      SELECT
        b.*,
        c.full_name as customer_name, c.phone as customer_phone,
        v.make as vehicle_make, v.model as vehicle_model, v.plate_number,
        d.full_name as driver_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      ORDER BY b.created_at DESC
    `;
    return NextResponse.json(bookings);
  } catch (err) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    let customerId = null;
    if (body.customer_name) {
      const existing = await sql`
        SELECT id FROM customers WHERE phone = ${body.customer_phone || ""} LIMIT 1
      `;
      if (existing.length > 0) {
        customerId = existing[0].id;
      } else {
        const newCustomer = await sql`
          INSERT INTO customers (full_name, phone, email)
          VALUES (${body.customer_name}, ${body.customer_phone || null}, ${body.customer_email || null})
          RETURNING id
        `;
        customerId = newCustomer[0].id;
      }
    }

    const refResult = await sql`SELECT nextval('booking_ref_seq') as seq`;
    const seq = refResult[0].seq.toString().padStart(3, "0");
    const year = new Date().getFullYear();
    const bookingRef = `ZT-${year}-${seq}`;

    const isBorrowed = !!body.is_borrowed_vehicle;

    // For a borrowed car we only capture WHO and WHAT here. What Zuri owes the
    // owner is agreed and entered later, at invoice time, once the trip is done.
    const result = await sql`
      INSERT INTO bookings (
        booking_ref, customer_id, vehicle_id, driver_id,
        service_type, status,
        pickup_location, pickup_region,
        dropoff_location, dropoff_region,
        pickup_datetime, dropoff_datetime,
        travel_details, notes,
        is_borrowed_vehicle, borrowed_vehicle_desc,
        borrowed_owner_name, borrowed_owner_phone
      ) VALUES (
        ${bookingRef},
        ${customerId},
        ${isBorrowed ? null : (body.vehicle_id || null)},
        ${body.driver_id || null},
        ${body.service_type},
        ${body.status || "confirmed"},
        ${body.pickup_location || null},
        ${body.pickup_region || null},
        ${body.dropoff_location || null},
        ${body.dropoff_region || null},
        ${body.pickup_datetime || null},
        ${body.dropoff_datetime || null},
        ${body.travel_details || null},
        ${body.notes || null},
        ${isBorrowed},
        ${isBorrowed ? (body.borrowed_vehicle_desc || null) : null},
        ${isBorrowed ? (body.borrowed_owner_name || null) : null},
        ${isBorrowed ? (body.borrowed_owner_phone || null) : null}
      ) RETURNING *
    `;

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
      UPDATE bookings SET
        status = ${body.status},
        vehicle_id = ${body.vehicle_id || null},
        driver_id = ${body.driver_id || null},
        pickup_location = ${body.pickup_location || null},
        pickup_region = ${body.pickup_region || null},
        dropoff_location = ${body.dropoff_location || null},
        dropoff_region = ${body.dropoff_region || null},
        pickup_datetime = ${body.pickup_datetime || null},
        dropoff_datetime = ${body.dropoff_datetime || null},
        travel_details = ${body.travel_details || null},
        notes = ${body.notes || null},
        quoted_amount = ${body.quoted_amount || null},
        paid_amount = ${body.paid_amount || 0},
        payment_method = ${body.payment_method || null},
        payment_status = ${body.payment_status || "unpaid"},
        updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING *
    `;
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

