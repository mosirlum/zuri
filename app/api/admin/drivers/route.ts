import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const drivers = await sql`SELECT * FROM drivers ORDER BY full_name`;
    return NextResponse.json(drivers);
  } catch (err) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// Drivers are now created exclusively from the Users page (which creates the
// login account and the linked driver record together). This endpoint no
// longer accepts new drivers directly.
export async function POST() {
  return NextResponse.json(
    { error: "Add drivers from the Users page — it creates their login and driver record together." },
    { status: 405 }
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await sql`
      UPDATE drivers SET
        full_name = ${body.full_name},
        phone = ${body.phone || null},
        email = ${body.email || null},
        status = ${body.status || "available"},
        license_number = ${body.license_number || null},
        license_class = ${body.license_class || null},
        license_expiry = ${body.license_expiry || null},
        psv_badge_number = ${body.psv_badge_number || null},
        psv_badge_expiry = ${body.psv_badge_expiry || null},
        medical_cert_expiry = ${body.medical_cert_expiry || null},
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
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
