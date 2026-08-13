import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // One booking is one job for the customer, but it may have used several
    // cars — each with its own driver and its own costs.
    const bookings = await sql`
      SELECT
        b.*,
        c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', bv.id,
              'vehicle_id', bv.vehicle_id,
              'driver_id', bv.driver_id,
              'vehicle_make', v.make,
              'vehicle_model', v.model,
              'plate_number', v.plate_number,
              'driver_name', d.full_name,
              'is_borrowed', bv.is_borrowed,
              'borrowed_vehicle_desc', bv.borrowed_vehicle_desc,
              'borrowed_owner_name', bv.borrowed_owner_name,
              'borrowed_owner_phone', bv.borrowed_owner_phone,
              'borrowed_payout_type', bv.borrowed_payout_type,
              'borrowed_payout_percent', bv.borrowed_payout_percent,
              'borrowed_payout_fixed', bv.borrowed_payout_fixed,
              'owner_payout_amount', bv.owner_payout_amount,
              'km_travelled', bv.km_travelled,
              'fuel_cost', bv.fuel_cost,
              'driver_allowance', bv.driver_allowance,
              'emergency_cost', bv.emergency_cost,
              'emergency_notes', bv.emergency_notes
            ) ORDER BY bv.id
          ) FILTER (WHERE bv.id IS NOT NULL),
          '[]'
        ) as vehicles
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN booking_vehicles bv ON bv.booking_id = b.id
      LEFT JOIN vehicles v ON bv.vehicle_id = v.id
      LEFT JOIN drivers d ON bv.driver_id = d.id
      GROUP BY b.id, c.full_name, c.phone, c.email
      ORDER BY b.created_at DESC
    `;
    return NextResponse.json(bookings);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

async function findOrCreateCustomer(name: string, phone?: string, email?: string) {
  if (!name) return null;
  const existing = await sql`
    SELECT id FROM customers WHERE phone = ${phone || ""} LIMIT 1
  `;
  if (existing.length > 0) return existing[0].id;

  const created = await sql`
    INSERT INTO customers (full_name, phone, email)
    VALUES (${name}, ${phone || null}, ${email || null})
    RETURNING id
  `;
  return created[0].id;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const customerId = await findOrCreateCustomer(body.customer_name, body.customer_phone, body.customer_email);

    const refResult = await sql`SELECT nextval('booking_ref_seq') as seq`;
    const seq = refResult[0].seq.toString().padStart(3, "0");
    const year = new Date().getFullYear();
    const bookingRef = `ZT-${year}-${seq}`;

    const result = await sql`
      INSERT INTO bookings (
        booking_ref, customer_id,
        service_type, status,
        pickup_location, pickup_region,
        dropoff_location, dropoff_region,
        pickup_datetime, dropoff_datetime,
        return_datetime,
        travel_details, notes
      ) VALUES (
        ${bookingRef},
        ${customerId},
        ${body.service_type},
        ${body.status || "confirmed"},
        ${body.pickup_location || null},
        ${body.pickup_region || null},
        ${body.dropoff_location || null},
        ${body.dropoff_region || null},
        ${body.pickup_datetime || null},
        ${body.dropoff_datetime || null},
        ${body.return_datetime || null},
        ${body.travel_details || null},
        ${body.notes || null}
      ) RETURNING *
    `;
    const booking = result[0];

    const vehicles = Array.isArray(body.vehicles) ? body.vehicles : [];
    for (const v of vehicles) {
      const isBorrowed = !!v.is_borrowed;
      await sql`
        INSERT INTO booking_vehicles (
          booking_id, vehicle_id, driver_id, is_borrowed,
          borrowed_vehicle_desc, borrowed_owner_name, borrowed_owner_phone
        ) VALUES (
          ${booking.id},
          ${isBorrowed ? null : (v.vehicle_id || null)},
          ${v.driver_id || null},
          ${isBorrowed},
          ${isBorrowed ? (v.borrowed_vehicle_desc || null) : null},
          ${isBorrowed ? (v.borrowed_owner_name || null) : null},
          ${isBorrowed ? (v.borrowed_owner_phone || null) : null}
        )
      `;
    }

    return NextResponse.json(booking);
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
    if (!body.id) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });

    const current = await sql`SELECT invoice_number, customer_id FROM bookings WHERE id = ${body.id} LIMIT 1`;
    if (current.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const alreadyInvoiced = !!current[0].invoice_number;

    let customerId = current[0].customer_id;
    if (body.customer_name) {
      customerId = await findOrCreateCustomer(body.customer_name, body.customer_phone, body.customer_email);
    }

    const result = await sql`
      UPDATE bookings SET
        customer_id = ${customerId},
        service_type = ${body.service_type},
        pickup_location = ${body.pickup_location || null},
        pickup_region = ${body.pickup_region || null},
        dropoff_location = ${body.dropoff_location || null},
        dropoff_region = ${body.dropoff_region || null},
        pickup_datetime = ${body.pickup_datetime || null},
        dropoff_datetime = ${body.dropoff_datetime || null},
        return_datetime = ${body.return_datetime || null},
        travel_details = ${body.travel_details || null},
        notes = ${body.notes || null},
        updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING *
    `;

    // Vehicles can only be reshuffled while the job is still open. Once an
    // invoice exists, each car already carries recorded costs and matching
    // expense rows, so swapping them out would leave those numbers orphaned.
    if (!alreadyInvoiced && Array.isArray(body.vehicles)) {
      const incoming = body.vehicles;
      const keepIds = incoming.map((v: any) => v.id).filter(Boolean);

      if (keepIds.length > 0) {
        await sql`
          DELETE FROM booking_vehicles
          WHERE booking_id = ${body.id} AND id NOT IN ${sql(keepIds)}
        `;
      } else {
        await sql`DELETE FROM booking_vehicles WHERE booking_id = ${body.id}`;
      }

      for (const v of incoming) {
        const isBorrowed = !!v.is_borrowed;
        if (v.id) {
          await sql`
            UPDATE booking_vehicles SET
              vehicle_id = ${isBorrowed ? null : (v.vehicle_id || null)},
              driver_id = ${v.driver_id || null},
              is_borrowed = ${isBorrowed},
              borrowed_vehicle_desc = ${isBorrowed ? (v.borrowed_vehicle_desc || null) : null},
              borrowed_owner_name = ${isBorrowed ? (v.borrowed_owner_name || null) : null},
              borrowed_owner_phone = ${isBorrowed ? (v.borrowed_owner_phone || null) : null},
              updated_at = NOW()
            WHERE id = ${v.id} AND booking_id = ${body.id}
          `;
        } else {
          await sql`
            INSERT INTO booking_vehicles (
              booking_id, vehicle_id, driver_id, is_borrowed,
              borrowed_vehicle_desc, borrowed_owner_name, borrowed_owner_phone
            ) VALUES (
              ${body.id},
              ${isBorrowed ? null : (v.vehicle_id || null)},
              ${v.driver_id || null},
              ${isBorrowed},
              ${isBorrowed ? (v.borrowed_vehicle_desc || null) : null},
              ${isBorrowed ? (v.borrowed_owner_name || null) : null},
              ${isBorrowed ? (v.borrowed_owner_phone || null) : null}
            )
          `;
        }
      }
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
