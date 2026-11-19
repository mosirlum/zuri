import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toAmount, toText, toDate } from "@/lib/validate";
import { neon } from "@neondatabase/serverless";
import { logActivity } from "@/lib/activity";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const expenses = await sql`
      SELECT e.*, b.booking_ref
      FROM expenses e
      LEFT JOIN bookings b ON e.booking_id = b.id
      ORDER BY e.expense_date DESC
    `;
    return NextResponse.json(expenses);
  } catch (err) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      category, description, amount, currency,
      expense_date, expense_type, period_months, next_due_date
    } = body;

    const amt = toAmount(amount);
    if (amt <= 0 || !toText(category, 60)) {
      return NextResponse.json({ error: "Category and an amount above 0 are required" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO expenses (
        category, description, amount, currency,
        expense_date, expense_type, period_months, next_due_date
      ) VALUES (
        ${toText(category, 60)},
        ${toText(description, 300)},
        ${amt},
        ${currency || 'TZS'},
        ${toDate(expense_date) || new Date().toISOString().split("T")[0]},
        ${expense_type || 'monthly'},
        ${parseInt(period_months) || 1},
        ${next_due_date || null}
      ) RETURNING *
    `;
    await logActivity(session, "Expense added", `${toText(category, 60)} · ${amt.toLocaleString("en-US")} TZS`);
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
