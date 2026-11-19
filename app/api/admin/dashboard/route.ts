import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // A car or driver counts as out when a live booking covers today. That
    // rule lives in one place so the dashboard, fleet list and driver list
    // can never disagree about who is free.
    const vehiclesQ = sql`
      SELECT v.status, v.insurance_expiry, v.operating_licence_expiry, v.road_worthiness_expiry,
             v.registration_expiry, v.tra_sticker_expiry, v.make, v.model,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.vehicle_id = v.id
            AND b.status <> 'cancelled'
            AND b.pickup_datetime > NOW()
            AND b.pickup_datetime < (date_trunc('day', NOW() AT TIME ZONE 'Africa/Dar_es_Salaam') + INTERVAL '1 day') AT TIME ZONE 'Africa/Dar_es_Salaam'
        ) AS leaves_today,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.vehicle_id = v.id
            AND b.status <> 'cancelled'
            AND b.pickup_datetime > NOW()
        ) AS booked_ahead,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.vehicle_id = v.id
            AND b.status <> 'cancelled'
            AND b.pickup_datetime IS NOT NULL
            AND b.pickup_datetime <= NOW()
            AND (
              COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime + INTERVAL '1 day') >= NOW()
            )
        ) AS on_trip
      FROM vehicles v
    `;

    const driversQ = sql`
      SELECT d.status, d.license_expiry, d.psv_badge_expiry, d.good_conduct_expiry, d.full_name,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.driver_id = d.id
            AND b.status <> 'cancelled'
            AND b.pickup_datetime > NOW()
            AND b.pickup_datetime < (date_trunc('day', NOW() AT TIME ZONE 'Africa/Dar_es_Salaam') + INTERVAL '1 day') AT TIME ZONE 'Africa/Dar_es_Salaam'
        ) AS leaves_today,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.driver_id = d.id
            AND b.status <> 'cancelled'
            AND b.pickup_datetime > NOW()
        ) AS booked_ahead,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.driver_id = d.id
            AND b.status <> 'cancelled'
            AND b.pickup_datetime IS NOT NULL
            AND b.pickup_datetime <= NOW()
            AND (
              COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime + INTERVAL '1 day') >= NOW()
            )
        ) AS on_trip
      FROM drivers d
    `;
    // All queries go out together; each one is a separate round trip to the
    // database, so waiting for them one by one made the dashboard slow.
    const [vehicles, drivers, confirmedBookings, recentBookings, totalsRows, weekRows] = await Promise.all([
      vehiclesQ,
      driversQ,
      sql`SELECT id FROM bookings WHERE status = 'confirmed'`,
      sql`SELECT booking_ref, status, service_type FROM bookings ORDER BY created_at DESC LIMIT 5`,
      sql`SELECT COUNT(*)::int AS total,
                 COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                 COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
                 COALESCE(SUM(paid_amount) FILTER (WHERE invoice_number IS NOT NULL AND COALESCE(payment_status, 'unpaid') <> 'paid'), 0) AS outstanding
          FROM bookings`,
      sql`SELECT (pickup_datetime AT TIME ZONE 'Africa/Dar_es_Salaam')::date::text AS d, COUNT(*)::int AS n
          FROM bookings WHERE pickup_datetime >= NOW() - INTERVAL '8 days' GROUP BY 1`,
    ]);

    const getDays = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const expiringDocs: any[] = [];

    vehicles.forEach((v: any) => {
      const docs = [
        { label: "Insurance", date: v.insurance_expiry },
        { label: "Operating Licence", date: v.operating_licence_expiry },
        { label: "Road Worthiness", date: v.road_worthiness_expiry },
        { label: "Registration", date: v.registration_expiry },
        { label: "TRA Sticker", date: v.tra_sticker_expiry },
      ];
      docs.forEach(({ label, date }) => {
        if (date) {
          const daysLeft = getDays(date);
          if (daysLeft <= 30) {
            expiringDocs.push({ name: `${v.make} ${v.model}`, document: label, expiry: date, daysLeft, type: "vehicle" });
          }
        }
      });
    });

    drivers.forEach((d: any) => {
      const docs = [
        { label: "Driving License", date: d.license_expiry },
        { label: "PSV Badge", date: d.psv_badge_expiry },
        { label: "Good Conduct", date: d.good_conduct_expiry },
      ];
      docs.forEach(({ label, date }) => {
        if (date) {
          const daysLeft = getDays(date);
          if (daysLeft <= 30) {
            expiringDocs.push({ name: d.full_name, document: label, expiry: date, daysLeft, type: "driver" });
          }
        }
      });
    });

    expiringDocs.sort((a, b) => a.daysLeft - b.daysLeft);

    return NextResponse.json({
      stats: {
        totalVehicles: vehicles.length,
        availableVehicles: vehicles.filter((v: any) => !v.on_trip && !v.leaves_today && v.status !== "maintenance").length,
        vehiclesLeavingToday: vehicles.filter((v: any) => !v.on_trip && v.leaves_today).length,
        vehiclesOnHire: vehicles.filter((v: any) => v.on_trip).length,
        vehiclesBooked: vehicles.filter((v: any) => !v.on_trip && v.booked_ahead).length,
        totalDrivers: drivers.length,
        availableDrivers: drivers.filter((d: any) => !d.on_trip && !d.leaves_today && d.status !== "leave").length,
        driversLeavingToday: drivers.filter((d: any) => !d.on_trip && d.leaves_today).length,
        driversOnLeave: drivers.filter((d: any) => d.status === "leave").length,
        driversOnDuty: drivers.filter((d: any) => d.on_trip).length,
        driversBooked: drivers.filter((d: any) => !d.on_trip && d.booked_ahead).length,
        confirmedBookings: confirmedBookings.length,
        expiringDocuments: expiringDocs.length,
      },
      expiringDocs,
      recentBookings,
      fleet: {
        total: vehicles.length,
        maintenance: vehicles.filter((v: any) => v.status === "maintenance").length,
        on_hire: vehicles.filter((v: any) => v.status !== "maintenance" && v.on_trip).length,
        booked: vehicles.filter((v: any) => v.status !== "maintenance" && !v.on_trip && v.booked_ahead).length,
        available: vehicles.filter((v: any) => v.status !== "maintenance" && !v.on_trip && !v.booked_ahead).length,
      },
      totals: {
        bookings: totalsRows[0]?.total || 0,
        completed: totalsRows[0]?.completed || 0,
        cancelled: totalsRows[0]?.cancelled || 0,
        outstanding: parseFloat(totalsRows[0]?.outstanding) || 0,
      },
      week: Object.fromEntries((weekRows as any[]).map(r => [r.d, r.n])),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
