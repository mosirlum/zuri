import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Vercel keeps console output in its own Logs tab, but nobody checks that
// day to day. This puts a record of anything that matters — a failed
// transaction, a rejected write — somewhere Ray can actually see it, without
// standing up a separate error-tracking service for three users.
export async function logError(context: string, error: unknown, meta?: Record<string, any>) {
  const message = error instanceof Error ? error.message : String(error);

  try {
    await sql`
      INSERT INTO error_log (context, message, meta)
      VALUES (${context}, ${message}, ${meta ? JSON.stringify(meta) : null})
    `;
  } catch {
    // If even the error log fails to write, there's nothing left to do but
    // let the original console.error stand — this must never throw and mask
    // the real failure.
  }

  console.error(`[${context}]`, error, meta || "");
}
