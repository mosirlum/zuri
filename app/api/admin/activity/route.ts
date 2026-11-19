import { NextResponse } from "next/server";
import { requireBoss, isGuardFailure } from "@/lib/guards";
import { recentActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await requireBoss();
  if (isGuardFailure(g)) return g.response;
  return NextResponse.json(await recentActivity(30));
}
