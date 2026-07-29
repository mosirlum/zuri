import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export default sql;

// Helper to get a single row
export async function queryOne<T>(
  query: TemplateStringsArray,
  ...values: any[]
): Promise<T | null> {
  const rows = await sql(query, ...values);
  return (rows[0] as T) || null;
}

// Helper to get multiple rows
export async function queryMany<T>(
  query: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  const rows = await sql(query, ...values);
  return rows as T[];
}
