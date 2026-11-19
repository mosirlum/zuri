// A plain record of who changed what. Written after the real action succeeds,
// and never allowed to break it: if the log can't be written (for instance the
// table hasn't been created yet) the action still goes through.

import sql from "@/lib/db";

export async function logActivity(session: any, action: string, detail: string) {
  try {
    const u = session?.user as any;
    await sql`INSERT INTO activity_log (user_name, action, detail)
              VALUES (${u?.name || u?.email || "Unknown"}, ${action}, ${detail.slice(0, 300)})`;
  } catch { /* logging must never block the work */ }
}

export async function recentActivity(limit = 20) {
  try {
    return await sql`SELECT id, user_name, action, detail, created_at FROM activity_log ORDER BY created_at DESC LIMIT ${limit}`;
  } catch {
    return [];
  }
}
