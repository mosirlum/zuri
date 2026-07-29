import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL!);

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
    }
    if (new_password.length < 4) {
      return NextResponse.json({ error: "New password is too short" }, { status: 400 });
    }

    const userId = session.user.id;
    const rows = await sql`SELECT password FROM users WHERE id = ${userId} LIMIT 1`;
    const user = rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const matches = await bcrypt.compare(current_password, user.password);
    if (!matches) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await sql`UPDATE users SET password = ${newHash}, updated_at = NOW() WHERE id = ${userId}`;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
