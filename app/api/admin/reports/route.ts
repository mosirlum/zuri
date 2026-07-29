import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "month";
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || new Date().getMonth().toString());
  const weekNum = parseInt(searchParams.get("week") || "1");
  const customStart = searchParams.get("start");
  const customEnd = searchParams.get("end");

  // Calculate date range
  let startDate: string;
  let endDate: string;

  if (type === "all") {
    startDate = "2020-01-01";
    endDate = "2099-12-31";
  } else if (type === "custom" && customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
  } else if (type === "week") {
    const jan1 = new Date(year, 0, 1);
    const daysToMonday = jan1.getDay() === 0 ? -6 : 1 - jan1.getDay();
    const firstMonday = new Date(jan1);
    firstMonday.setDate(jan1.getDate() + daysToMonday);
    const start = new Date(firstMonday);
    start.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    startDate = start.toISOString().split("T")[0];
    endDate = end.toISOString().split("T")[0];
  } else if (type === "month") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    startDate = start.toISOString().split("T")[0];
    endDate = end.toISOString().split("T")[0];
  } else {
    startDate = `${year}-01-01`;
    endDate = `${year}-12-31`;
  }

  try {
    // Get bookings with revenue
    const bookings = await sql`
      SELECT b.*, c.full_name as customer_name,
        v.make as vehicle_make, v.model as vehicle_model,
        d.full_name as driver_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE b.pickup_datetime::date BETWEEN ${startDate}::date AND ${endDate}::date
      ORDER BY b.pickup_datetime ASC
    `;

    // Get expenses
    const expenses = await sql`
      SELECT * FROM expenses
      WHERE expense_date BETWEEN ${startDate}::date AND ${endDate}::date
      ORDER BY expense_date ASC
    `;

    // Get all vehicles and drivers for summary
    const vehicles = await sql`SELECT * FROM vehicles ORDER BY make`;
    const drivers = await sql`SELECT * FROM drivers ORDER BY full_name`;

    const totalRevenue = bookings.reduce((sum: number, b: any) =>
      sum + (parseFloat(b.paid_amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, e: any) =>
      sum + (parseFloat(e.amount) || 0), 0);

    return NextResponse.json({
      period: { type, year, month, weekNum, startDate, endDate },
      bookings,
      expenses,
      vehicles,
      drivers,
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalBookings: bookings.length,
        completedBookings: bookings.filter((b: any) => b.status === "completed").length,
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
