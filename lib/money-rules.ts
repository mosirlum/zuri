// One place for the rules that turn raw rows into money. The reports page,
// the dashboard, the growth page and the written analysis all read these, so
// they can never disagree about what counts as a trip cost or a company cost.
//
// No database access in here on purpose: this file is safe to import from
// client components as well as server code.

// Costs that exist because of the cars: they rise and fall with how much the
// fleet is used or what it needs to stay on the road.
export const VEHICLE_CATEGORIES = new Set([
  "fuel", "maintenance", "insurance_premium", "license_renewal", "road_worthiness",
]);

// An expense belongs to the vehicle layer if it was logged against a trip, or
// if its category is inherently about running a car. Everything else is the
// cost of keeping the company's doors open, trips or no trips.
export const isVehicleCost = (e: { expense_type?: string | null; category?: string | null }) =>
  e.expense_type === "trip" || VEHICLE_CATEGORIES.has(e.category || "");

export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

// 18,640,000 -> "18.64M", 750,000 -> "750K"
export function short(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e6) return sign + (a / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (a >= 1e3) return sign + Math.round(a / 1e3).toLocaleString("en-US") + "K";
  return sign + Math.round(a).toString();
}

export const tzs = (n: number) => `TZS ${short(n)}`;
export const full = (n: number) => Math.round(n).toLocaleString("en-US");
