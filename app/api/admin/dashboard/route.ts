import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vehicles = await sql`SELECT status, insurance_expiry, operating_licence_expiry, road_worthiness_expiry, registration_expiry, tra_sticker_expiry, make, model FROM vehicles`;
    const drivers = await sql`SELECT status, license_expiry, psv_badge_expiry, good_conduct_expiry, full_name FROM drivers`;
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
        availableVehicles: vehicles.filter((v: any) => v.status === "available").length,
        totalDrivers: drivers.length,
        availableDrivers: drivers.filter((d: any) => d.status === "available").length,
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
