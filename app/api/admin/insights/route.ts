import { NextRequest, NextResponse } from "next/server";
import { requireSession, isGuardFailure } from "@/lib/guards";
import { buildInsights } from "@/lib/insights";
import { logError } from "@/lib/error-log";

export const dynamic = "force-dynamic";

// Everyone signed in gets the "needs attention" list. Only the boss gets the
// money: profit, receivables, growth and the written analysis.
export async function GET(req: NextRequest) {
  const g = await requireSession();
  if (isGuardFailure(g)) return g.response;
  const isBoss = (g.session.user as any)?.role === "super_admin";

  const sp = new URL(req.url).searchParams;
  const y = parseInt(sp.get("year") || "");
  const m = parseInt(sp.get("month") || "");
  const okMonth = Number.isInteger(m) && m >= 0 && m <= 11;
  const okYear = Number.isInteger(y) && y >= 2020 && y <= 2100;

  try {
    const data = await buildInsights({
      money: isBoss,
      year: okYear && okMonth ? y : undefined,
      month: okYear && okMonth ? m : undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    await logError("api/admin/insights", err);
    return NextResponse.json({ error: "Could not load insights" }, { status: 500 });
  }
}
