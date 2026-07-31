import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;
  if (!session || role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    if (String(body.id) === String(currentUserId)) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const users = await sql`SELECT id, full_name, role FROM users WHERE id = ${body.id} LIMIT 1`;
    const user = users[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // A driver who has already worked trips can't be deleted — removing them
    // would strip their name from the trip records those reports depend on.
    const drivers = await sql`SELECT id FROM drivers WHERE user_id = ${body.id} LIMIT 1`;
    const driver = drivers[0];

    if (driver) {
      const counts = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM bookings WHERE driver_id = ${driver.id}) as bookings,
          (SELECT COUNT(*)::int FROM trip_assignments WHERE driver_id = ${driver.id}) as assignments
      `;
      const total = (counts[0]?.bookings || 0) + (counts[0]?.assignments || 0);

      if (total > 0) {
        return NextResponse.json({
          error: "has_history",
          count: total,
          message: `${user.full_name} is linked to ${total} trip record${total === 1 ? "" : "s"}.`,
        }, { status: 409 });
      }

      await sql`DELETE FROM drivers WHERE id = ${driver.id}`;
    }

    await sql`DELETE FROM users WHERE id = ${body.id}`;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
