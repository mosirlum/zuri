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
    const vehicles = await sql`
      SELECT v.status, v.insurance_expiry, v.operating_licence_expiry, v.road_worthiness_expiry,
             v.registration_expiry, v.tra_sticker_expiry, v.make, v.model,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.vehicle_id = v.id
            AND b.status = 'confirmed'
            AND b.invoice_number IS NULL
            AND b.pickup_datetime > NOW()
        ) AS booked_ahead,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.vehicle_id = v.id
            AND b.status = 'confirmed'
            AND b.invoice_number IS NULL
            AND b.pickup_datetime IS NOT NULL
            AND b.pickup_datetime <= NOW()
            AND (
              COALESCE(b.return_datetime, b.dropoff_datetime) IS NULL
              OR COALESCE(b.return_datetime, b.dropoff_datetime) >= NOW()
            )
        ) AS on_trip
      FROM vehicles v
    `;

    const drivers = await sql`
      SELECT d.status, d.license_expiry, d.psv_badge_expiry, d.good_conduct_expiry, d.full_name,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
          JOIN bookings b ON b.id = bv.booking_id
          WHERE bv.driver_id = d.id
            AND b.status = 'confirmed'
            AND b.invoice_number IS NULL
            AND b.pickup_datetime > NOW()
        ) AS booked_ahead,
        EXISTS (
          SELECT 1 FROM booking_vehicles bv
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
    `;
    const confirmedBookings = await sql`SELECT id FROM bookings WHERE status = 'confirmed'`;
    const recentBookings = await sql`SELECT booking_ref, status, service_type FROM bookings ORDER BY created_at DESC LIMIT 5`;

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
        availableVehicles: vehicles.filter((v: any) => !v.on_trip && v.status !== "maintenance").length,
        vehiclesOnHire: vehicles.filter((v: any) => v.on_trip).length,
        vehiclesBooked: vehicles.filter((v: any) => !v.on_trip && v.booked_ahead).length,
        totalDrivers: drivers.length,
        availableDrivers: drivers.filter((d: any) => !d.on_trip && d.status !== "leave").length,
        driversOnDuty: drivers.filter((d: any) => d.on_trip).length,
        driversBooked: drivers.filter((d: any) => !d.on_trip && d.booked_ahead).length,
        confirmedBookings: confirmedBookings.length,
        expiringDocuments: expiringDocs.length,
      },
      expiringDocs,
      recentBookings,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
