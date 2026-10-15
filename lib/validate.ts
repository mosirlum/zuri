// Numbers arriving from a form are strings, and sometimes they're empty, or a
// stray letter, or a figure with commas in it. parseFloat quietly turns those
// into NaN, which then lands in the database as a broken row. Everything money
// or distance related goes through here first.

export function toAmount(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

// Same rules, but keeps the difference between "nothing entered" and zero —
// mileage of 0 means the trip ran no distance, while null means unrecorded.
export function toOptionalAmount(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function toPercent(value: any): number {
  const n = toAmount(value);
  return n > 100 ? 100 : n;
}

export function toText(value: any, maxLength = 500): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, maxLength);
}

export function toDate(value: any): string | null {
  const s = toText(value, 40);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : s;
}

export function toId(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}
