import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vehicles = await sql`SELECT * FROM vehicles ORDER BY make, model`;
    return NextResponse.json(vehicles);
  } catch (err) {
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
        ${body.status || "available"},
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
        color = ${body.color || null}, status = ${body.status},
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
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

