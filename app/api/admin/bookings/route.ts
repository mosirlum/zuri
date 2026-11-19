import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { logActivity } from "@/lib/activity";

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
    // The printed delivery note and invoice (document_data) can be large and
    // the list never shows it, so it is left out here and loaded only when a
    // booking's documents are opened.
    return NextResponse.json(bookings.map(({ document_data, ...b }: any) => ({ ...b, has_documents: !!document_data })));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// A car or a driver can only be in one place at a time. This looks for any
// other live booking whose dates overlap the one being saved.
// A trip can't end before it starts. Catching it here keeps the reports and
// the busy-window logic from having to cope with impossible dates.
function checkDates(body: any) {
  const pickup = body.pickup_datetime ? new Date(body.pickup_datetime) : null;
  if (!pickup) return null;

  const dropoff = body.dropoff_datetime ? new Date(body.dropoff_datetime) : null;
  if (dropoff && dropoff < pickup) return "Drop-off cannot be before pickup";

  const ret = body.return_datetime ? new Date(body.return_datetime) : null;
  if (ret && ret < pickup) return "Return cannot be before pickup";
  if (ret && dropoff && ret < dropoff) return "Return cannot be before drop-off";

  return null;
}

async function findClashes(
  vehicles: any[],
  pickup: string | null,
  ends: string | null,
  excludeBookingId?: number,
) {
  if (!pickup) return [];

  const start = pickup;
  const end = ends || pickup;
  const vehicleIds = vehicles.map(v => v.vehicle_id).filter(Boolean);
  const driverIds = vehicles.map(v => v.driver_id).filter(Boolean);
  if (vehicleIds.length === 0 && driverIds.length === 0) return [];

  const rows = await sql`
    SELECT
      bv.vehicle_id, bv.driver_id,
      b.booking_ref, b.pickup_datetime,
      COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime + interval '1 day') as ends_at,
      v.make, v.model, v.plate_number,
      d.full_name as driver_name
    FROM booking_vehicles bv
    JOIN bookings b ON b.id = bv.booking_id
    LEFT JOIN vehicles v ON v.id = bv.vehicle_id
    LEFT JOIN drivers d ON d.id = bv.driver_id
    WHERE b.status <> 'cancelled'
      AND b.id <> ${excludeBookingId || -1}
      AND b.pickup_datetime IS NOT NULL
      AND b.pickup_datetime <= ${end}::timestamptz
      AND COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime + interval '1 day') >= ${start}::timestamptz
      AND (
        (bv.vehicle_id IS NOT NULL AND bv.vehicle_id = ANY(${vehicleIds}::int[]))
        OR (bv.driver_id IS NOT NULL AND bv.driver_id = ANY(${driverIds}::int[]))
      )
  `;

  return rows.map((r: any) => ({
    booking_ref: r.booking_ref,
    vehicle: r.vehicle_id && vehicleIds.includes(r.vehicle_id)
      ? [r.make, r.model].filter(Boolean).join(" ") + (r.plate_number ? ` (${r.plate_number})` : "")
      : null,
    driver: r.driver_id && driverIds.includes(r.driver_id) ? r.driver_name : null,
    from: r.pickup_datetime,
    to: r.ends_at,
  }));
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

    const dateError = checkDates(body);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

    const clashes = await findClashes(
      Array.isArray(body.vehicles) ? body.vehicles : [],
      body.pickup_datetime,
      body.return_datetime || body.dropoff_datetime,
    );
    if (clashes.length > 0 && !body.force) {
      return NextResponse.json({ error: "clash", clashes }, { status: 409 });
    }

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

    await logActivity(session, "Booking created", `${booking.booking_ref}`);
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

    const dateError = checkDates(body);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

    const clashes = await findClashes(
      Array.isArray(body.vehicles) ? body.vehicles : [],
      body.pickup_datetime,
      body.return_datetime || body.dropoff_datetime,
      body.id,
    );
    if (clashes.length > 0 && !body.force) {
      return NextResponse.json({ error: "clash", clashes }, { status: 409 });
    }

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

    await logActivity(session, "Booking edited", `${result[0].booking_ref}`);
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
