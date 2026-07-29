import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL!);

async function requireSuperAdmin() {
  const session = await auth();
  if (!session) return null;
  const role = (session.user as any)?.role;
  if (role !== "super_admin") return null;
  return session;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const users = await sql`
      SELECT id, email, full_name, role, phone, is_active, created_at
      FROM users
      ORDER BY
        CASE role WHEN 'super_admin' THEN 0 WHEN 'staff' THEN 1 ELSE 2 END,
        full_name
    `;
    return NextResponse.json(users);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();

    if (!body.full_name || !body.email || !body.password || !body.role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${body.email} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const result = await sql`
      INSERT INTO users (email, password, full_name, role, phone, is_active)
      VALUES (
        ${body.email}, ${passwordHash}, ${body.full_name},
        ${body.role}::user_role, ${body.phone || null}, true
      )
      RETURNING id, email, full_name, role, phone, is_active, created_at
    `;
    const newUser = result[0];

    // If the new account is a driver, create their linked driver record
    // automatically so they appear on the Drivers page right away.
    if (body.role === "driver") {
      await sql`
        INSERT INTO drivers (user_id, full_name, phone, email, status)
        VALUES (${newUser.id}, ${body.full_name}, ${body.phone || null}, ${body.email}, 'available')
      `;
    }

    return NextResponse.json(newUser);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    // Prevent the super_admin from locking themselves out
    const currentUserId = (session.user as any)?.id;
    if (String(body.id) === String(currentUserId) && body.is_active === false) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
    }

    if (body.new_password) {
      const passwordHash = await bcrypt.hash(body.new_password, 10);
      await sql`UPDATE users SET password = ${passwordHash}, updated_at = NOW() WHERE id = ${body.id}`;
    }

    const result = await sql`
      UPDATE users SET
        full_name = ${body.full_name},
        role = ${body.role}::user_role,
        phone = ${body.phone || null},
        is_active = ${body.is_active},
        updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING id, email, full_name, role, phone, is_active, created_at
    `;
    const updatedUser = result[0];

    // Keep the linked driver record's name/phone in sync.
    // If the role is (or just became) driver but no driver row exists yet, create one.
    if (updatedUser.role === "driver") {
      const existingDriver = await sql`SELECT id FROM drivers WHERE user_id = ${body.id} LIMIT 1`;
      if (existingDriver.length > 0) {
        await sql`
          UPDATE drivers SET
            full_name = ${updatedUser.full_name},
            phone = ${updatedUser.phone || null},
            updated_at = NOW()
          WHERE user_id = ${body.id}
        `;
      } else {
        await sql`
          INSERT INTO drivers (user_id, full_name, phone, email, status)
          VALUES (${body.id}, ${updatedUser.full_name}, ${updatedUser.phone || null}, ${updatedUser.email}, 'available')
        `;
      }
    }

    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
