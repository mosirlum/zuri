import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireBoss, isGuardFailure } from "@/lib/guards";
import { getTargetMargin } from "@/lib/insights";
import { toPercent } from "@/lib/validate";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const g = await requireBoss();
  if (isGuardFailure(g)) return g.response;
  return NextResponse.json({ target_margin: await getTargetMargin() });
}

export async function PUT(req: NextRequest) {
  const g = await requireBoss();
  if (isGuardFailure(g)) return g.response;
  const body = await req.json().catch(() => ({}));
  const v = toPercent(body.target_margin);
  if (v <= 0 || v >= 100) {
    return NextResponse.json({ error: "Target margin must be between 1 and 99" }, { status: 400 });
  }
  try {
    await sql`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`INSERT INTO app_settings (key, value) VALUES ('target_margin', ${String(v)})
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
    await logActivity(g.session, "Settings", `Target margin set to ${v}%`);
    return NextResponse.json({ target_margin: v });
  } catch {
    return NextResponse.json({ error: "Could not save. Nothing was changed." }, { status: 500 });
  }
}
