import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireBoss, isGuardFailure } from "@/lib/guards";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const guard = await requireBoss();
  if (isGuardFailure(guard)) return guard.response;

  try {
    const rows = await sql`
      SELECT id, context, message, meta, created_at
      FROM error_log
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return NextResponse.json(rows);
  } catch (err) {
    // The error log failing to read is not itself worth logging — that would
    // risk a loop. Just report nothing rather than break the settings page.
    console.error("Could not read error_log:", err);
    return NextResponse.json([]);
  }
}
