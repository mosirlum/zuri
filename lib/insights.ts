// Everything the owner is told about the business, worked out from data that
// already exists. Nothing here writes, and nothing here needs a new column:
// profit, direction, forecast, "needs attention" and the written analysis are
// all derived from bookings, booking_vehicles, expenses and vehicle/driver
// documents.
//
// Dates are read in East Africa Time so "today" and "this month" mean what
// the people in the office mean, wherever the server happens to run.

import sql from "@/lib/db";
import { isVehicleCost, num, short, tzs } from "@/lib/money-rules";

const DAY = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const ymOf = (y: number, m: number) => { const d = new Date(Date.UTC(y, m, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
const labelOf = (y: number, m: number) => { const d = new Date(Date.UTC(y, m, 1)); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export type Seg = { t: string; k?: "g" | "r" | "a" | "b" };
export type Finding = {
  id: string; severity: "critical" | "warning" | "info" | "good"; title: string; what: string; why: string;
  actions: string[]; impact: number | null; evidence: { label: string; value: string }[];
  items?: { label: string; value: string; href?: string }[]; fixFirst?: boolean;
};
const p0label = (y: number, m: number) => MONTHS[new Date(Date.UTC(y, m, 1)).getUTCMonth()];
export type AttentionItem = {
  id: string; tone: "bad" | "warn" | "info"; title: string; detail: string; href: string; cta: string; money?: boolean;
};

export async function getTargetMargin(): Promise<number> {
  try {
    const r = await sql`SELECT value FROM app_settings WHERE key = 'target_margin'`;
    const v = parseFloat((r[0] as any)?.value);
    if (v > 0 && v < 100) return v;
  } catch { /* table not created yet: use the default */ }
  return 40;
}

export async function buildInsights(opts: { money: boolean; year?: number; month?: number }) {
  const eat = new Date(Date.now() + 3 * 3600 * 1000);
  const nowY = eat.getUTCFullYear(), nowM = eat.getUTCMonth(), nowD = eat.getUTCDate();
  const todayISO = iso(eat);

  const y = Number.isInteger(opts.year) ? (opts.year as number) : nowY;
  const m = Number.isInteger(opts.month) ? (opts.month as number) : nowM;
  const isCurrent = y === nowY && m === nowM;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const elapsed = isCurrent ? nowD : days;
  const startISO = iso(new Date(Date.UTC(y, m, 1)));
  const endISO = iso(new Date(Date.UTC(y, m, elapsed)));
  const hist0 = iso(new Date(Date.UTC(y, m - 5, 1)));
  const prevStart = iso(new Date(Date.UTC(y, m - 1, 1)));
  const prevDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const prevEnd = iso(new Date(Date.UTC(y, m - 1, Math.min(elapsed, prevDays))));
  const dailyFrom = [startISO, iso(new Date(Date.UTC(nowY, nowM, nowD - 34)))].sort()[0];
  const dailyTo = isCurrent ? endISO : [endISO, todayISO].sort()[1];
  const targetP = getTargetMargin();
  // Every query goes out at once: they do not depend on each other, and each is
  // its own round trip to the database.
  const moneyP = !opts.money ? null : Promise.all([
    sql`SELECT to_char(pickup_datetime::date, 'YYYY-MM') AS ym, COALESCE(SUM(paid_amount), 0) AS revenue, COUNT(*)::int AS jobs
        FROM bookings WHERE pickup_datetime::date BETWEEN ${hist0}::date AND ${endISO}::date GROUP BY 1`,
    sql`SELECT to_char(expense_date, 'YYYY-MM') AS ym, expense_type, category, COALESCE(SUM(amount), 0) AS amount
        FROM expenses WHERE expense_date BETWEEN ${hist0}::date AND ${endISO}::date GROUP BY 1, 2, 3`,
    sql`SELECT COALESCE(SUM(paid_amount), 0) AS revenue, COUNT(*)::int AS jobs FROM bookings WHERE pickup_datetime::date BETWEEN ${prevStart}::date AND ${prevEnd}::date`,
    sql`SELECT expense_type, category, COALESCE(SUM(amount), 0) AS amount FROM expenses
        WHERE expense_date BETWEEN ${prevStart}::date AND ${prevEnd}::date GROUP BY 1, 2`,
    sql`SELECT pickup_datetime::date::text AS d, COALESCE(SUM(paid_amount), 0) AS rev, COUNT(*)::int AS jobs FROM bookings
        WHERE pickup_datetime::date BETWEEN ${dailyFrom}::date AND ${dailyTo}::date GROUP BY 1`,
    sql`SELECT b.id, b.booking_ref, b.invoice_number, b.invoice_date, b.paid_amount, c.full_name AS customer
        FROM bookings b LEFT JOIN customers c ON c.id = b.customer_id
        WHERE b.invoice_number IS NOT NULL AND COALESCE(b.payment_status, 'unpaid') <> 'paid'`,
    sql`SELECT bv.vehicle_id, b.paid_amount, b.pickup_datetime,
               COALESCE(b.return_datetime, b.dropoff_datetime) AS end_dt,
               bv.fuel_cost, bv.driver_allowance, bv.emergency_cost, bv.owner_payout_amount,
               (SELECT COUNT(*)::int FROM booking_vehicles x WHERE x.booking_id = bv.booking_id) AS n
        FROM booking_vehicles bv JOIN bookings b ON b.id = bv.booking_id
        WHERE bv.vehicle_id IS NOT NULL AND b.pickup_datetime::date BETWEEN ${startISO}::date AND ${endISO}::date`,
    sql`SELECT b.customer_id, c.full_name, COALESCE(SUM(b.paid_amount), 0) AS rev, COUNT(*)::int AS jobs,
               EXISTS (SELECT 1 FROM bookings o WHERE o.customer_id = b.customer_id AND o.pickup_datetime::date < ${startISO}::date) AS is_returning
        FROM bookings b LEFT JOIN customers c ON c.id = b.customer_id
        WHERE b.customer_id IS NOT NULL AND b.pickup_datetime::date BETWEEN ${startISO}::date AND ${endISO}::date
        GROUP BY b.customer_id, c.full_name`,
    sql`SELECT COALESCE(service_type, 'other') AS service, COALESCE(SUM(paid_amount), 0) AS rev, COUNT(*)::int AS jobs
        FROM bookings WHERE pickup_datetime::date BETWEEN ${startISO}::date AND ${endISO}::date GROUP BY 1 ORDER BY rev DESC`,
    sql`SELECT d.full_name AS name, COUNT(*)::int AS trips,
               COALESCE(SUM(b.paid_amount / GREATEST(1, (SELECT COUNT(*) FROM booking_vehicles x WHERE x.booking_id = b.id))), 0) AS rev
        FROM booking_vehicles bv JOIN bookings b ON b.id = bv.booking_id JOIN drivers d ON d.id = bv.driver_id
        WHERE b.status <> 'cancelled' AND b.pickup_datetime::date BETWEEN ${startISO}::date AND ${endISO}::date
        GROUP BY d.full_name ORDER BY rev DESC`,
    sql`SELECT b.id, b.booking_ref, b.pickup_datetime, b.service_type, b.status, b.paid_amount, b.quoted_amount,
               b.invoice_number, b.payment_status, c.full_name AS customer
        FROM bookings b LEFT JOIN customers c ON c.id = b.customer_id
        WHERE b.pickup_datetime::date BETWEEN ${startISO}::date AND ${endISO}::date
        ORDER BY b.pickup_datetime DESC LIMIT 300`,
  ]);

  moneyP?.catch(() => { /* reported where it is awaited */ });
  const [target, vehRows, drvRows, attnEnded, attnNoDriver] = await Promise.all([
    targetP,
    sql`SELECT id, make, model, plate_number, status, insurance_expiry, operating_licence_expiry,
               road_worthiness_expiry, registration_expiry, tra_sticker_expiry, next_service_date
        FROM vehicles`,
    sql`SELECT id, full_name, license_expiry, psv_badge_expiry, good_conduct_expiry FROM drivers`,
    sql`SELECT b.id, b.booking_ref, b.quoted_amount, c.full_name AS customer,
               COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime) AS ended
        FROM bookings b LEFT JOIN customers c ON c.id = b.customer_id
        WHERE b.status <> 'cancelled' AND b.invoice_number IS NULL
          AND COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime) < NOW() - INTERVAL '1 day'
        ORDER BY ended ASC LIMIT 20`,
    sql`SELECT b.id, b.booking_ref, b.pickup_datetime, c.full_name AS customer,
               (SELECT COUNT(*)::int FROM booking_vehicles x WHERE x.booking_id = b.id) AS cars,
               (SELECT COUNT(*)::int FROM booking_vehicles x WHERE x.booking_id = b.id
                  AND x.driver_id IS NULL AND COALESCE(x.is_borrowed, false) = false) AS no_driver
        FROM bookings b LEFT JOIN customers c ON c.id = b.customer_id
        WHERE b.status <> 'cancelled'
          AND b.pickup_datetime >= NOW() AND b.pickup_datetime < NOW() + INTERVAL '3 days'
        ORDER BY b.pickup_datetime ASC`,
  ]);

  const attention: AttentionItem[] = [];
  const daysTo = (d: any) => Math.ceil((new Date(d).getTime() - Date.now()) / DAY);

  // Documents and services, nearest first.
  const docDefs = (v: any) => ([
    ["Insurance", v.insurance_expiry], ["Operating licence", v.operating_licence_expiry],
    ["Road worthiness", v.road_worthiness_expiry], ["Registration", v.registration_expiry],
    ["TRA sticker", v.tra_sticker_expiry],
  ] as [string, any][]);
  for (const v of vehRows as any[]) {
    for (const [label, date] of docDefs(v)) {
      if (!date) continue;
      const left = daysTo(date);
      if (left > 14) continue;
      attention.push({
        id: `vd-${v.id}-${label}`, tone: left <= 7 ? "bad" : "warn",
        title: left <= 0 ? `${v.make} ${v.model} ${label.toLowerCase()} has expired` : `${v.make} ${v.model} ${label.toLowerCase()} expires in ${left} day${left === 1 ? "" : "s"}`,
        detail: v.plate_number || "Vehicle", href: `/admin/fleet?vehicle=${v.id}`, cta: "Open vehicle",
      });
    }
    if (v.next_service_date) {
      const left = daysTo(v.next_service_date);
      if (left <= 10) attention.push({
        id: `sv-${v.id}`, tone: left <= 0 ? "bad" : "info",
        title: left <= 0 ? `${v.make} ${v.model} service is overdue` : `${v.make} ${v.model} service due in ${left} day${left === 1 ? "" : "s"}`,
        detail: v.plate_number || "Vehicle", href: `/admin/fleet?vehicle=${v.id}`, cta: "Open vehicle",
      });
    }
  }
  for (const d of drvRows as any[]) {
    for (const [label, date] of [["Driving licence", d.license_expiry], ["PSV badge", d.psv_badge_expiry], ["Good conduct", d.good_conduct_expiry]] as [string, any][]) {
      if (!date) continue;
      const left = daysTo(date);
      if (left > 14) continue;
      attention.push({
        id: `dd-${d.id}-${label}`, tone: left <= 7 ? "bad" : "warn",
        title: left <= 0 ? `${d.full_name}: ${label.toLowerCase()} has expired` : `${d.full_name}: ${label.toLowerCase()} expires in ${left} day${left === 1 ? "" : "s"}`,
        detail: "Driver", href: `/admin/drivers?driver=${d.id}`, cta: "Open driver",
      });
    }
  }
  for (const b of attnNoDriver as any[]) {
    if (b.cars === 0 || b.no_driver > 0) {
      const hrs = Math.max(0, Math.round((new Date(b.pickup_datetime).getTime() - Date.now()) / 3600000));
      attention.push({
        id: `nd-${b.id}`, tone: hrs <= 24 ? "bad" : "warn",
        title: `${b.booking_ref} starts in ${hrs < 24 ? `${hrs}h` : `${Math.round(hrs / 24)} day${Math.round(hrs / 24) === 1 ? "" : "s"}`} with ${b.cars === 0 ? "no vehicle" : "no driver"} assigned`,
        detail: b.customer || "Booking", href: `/admin/bookings?open=${b.id}&do=edit`, cta: b.cars === 0 ? "Assign vehicle" : "Assign driver",
      });
    }
  }
  if (opts.money) {
    for (const b of attnEnded as any[]) {
      const ago = Math.max(1, Math.floor((Date.now() - new Date(b.ended).getTime()) / DAY));
      attention.push({
        id: `ne-${b.id}`, tone: ago >= 7 ? "bad" : "warn", money: true,
        title: `${b.booking_ref} ended ${ago} day${ago === 1 ? "" : "s"} ago and is not invoiced`,
        detail: `${b.customer || "Customer"}${num(b.quoted_amount) ? ` · ${tzs(num(b.quoted_amount))}` : ""}`,
        href: `/admin/bookings?open=${b.id}&do=invoice`, cta: "Create invoice",
      });
    }
  }

  if (!opts.money) {
    const order = { bad: 0, warn: 1, info: 2 } as const;
    attention.sort((a, b) => order[a.tone] - order[b.tone]);
    return { period: { year: y, month: m, label: labelOf(y, m), elapsed, days, isCurrent }, target, attention: attention.slice(0, 8) };
  }

  // ── money (boss only) ───────────────────────────────────────────────────
  const [revHist, expHist, prevRev, prevExp, daily, recv, bvRows, custRows, svcRows, drvRows2, jobRows] = (await moneyP)!;

  // Six-month history, oldest first.
  const history = Array.from({ length: 6 }, (_, i) => {
    const mm = m - 5 + i;
    const key = ymOf(y, mm);
    const rev = (revHist as any[]).find(r => r.ym === key);
    const ex = (expHist as any[]).filter(r => r.ym === key);
    const revenue = num(rev?.revenue);
    const veh = ex.filter(isVehicleCost).reduce((s, r) => s + num(r.amount), 0);
    const co = ex.filter(r => !isVehicleCost(r)).reduce((s, r) => s + num(r.amount), 0);
    const d = new Date(Date.UTC(y, mm, 1));
    return { ym: key, label: MONTHS[d.getUTCMonth()], revenue, vehicleCosts: veh, companyCosts: co, net: revenue - veh - co, jobs: num(rev?.jobs), partial: isCurrent && i === 5 };
  });
  const cur = history[5];
  const margin = cur.revenue > 0 ? (cur.net / cur.revenue) * 100 : 0;

  const prevRevenue = num((prevRev as any[])[0]?.revenue);
  const prevVeh = (prevExp as any[]).filter(isVehicleCost).reduce((s, r) => s + num(r.amount), 0);
  const prevCo = (prevExp as any[]).filter(r => !isVehicleCost(r)).reduce((s, r) => s + num(r.amount), 0);
  const prevNet = prevRevenue - prevVeh - prevCo;
  const prevMargin = prevRevenue > 0 ? (prevNet / prevRevenue) * 100 : null;
  const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);
  const prevLabel = labelOf(y, m - 1);

  // Cumulative revenue through the month.
  const byDay: Record<string, number> = {};
  const jobsByDay: Record<string, number> = {};
  for (const r of daily as any[]) { byDay[r.d] = num(r.rev); jobsByDay[r.d] = num(r.jobs); }
  let acc = 0;
  const cumulative = Array.from({ length: elapsed }, (_, i) => { acc += byDay[iso(new Date(Date.UTC(y, m, i + 1)))] || 0; return acc; });

  // Direction from completed months only.
  const complete = history.filter(h => !h.partial && (h.revenue > 0 || h.net !== 0));
  let direction: { key: "growing" | "steady" | "declining" | "unknown"; text: string } = { key: "unknown", text: "Not enough history yet. This fills in as months complete." };
  if (complete.length >= 2) {
    const nets = complete.map(h => h.net);
    const last = nets[nets.length - 1];
    const before = nets.slice(0, -1);
    const avg = before.reduce((s, v) => s + v, 0) / before.length;
    const rises = nets.slice(1).filter((v, i) => v > nets[i]).length;
    const key = last > avg * 1.1 ? "growing" : last < avg * 0.9 ? "declining" : "steady";
    direction = { key, text: `Profit rose in ${rises} of the last ${nets.length - 1} month${nets.length - 1 === 1 ? "" : "s"}.` };
  }

  // Forecast: this pace, with company costs held at their usual monthly level.
  let forecast: { revenue: number; net: number } | null = null;
  if (isCurrent && elapsed >= 5) {
    const f = days / elapsed;
    const prior = history.slice(2, 5).filter(h => h.companyCosts > 0);
    const usualCo = prior.length ? prior.reduce((s, h) => s + h.companyCosts, 0) / prior.length : cur.companyCosts;
    const projRev = cur.revenue * f;
    forecast = { revenue: projRev, net: projRev - cur.vehicleCosts * f - Math.max(cur.companyCosts, usualCo) };
  }

  // This week against a usual week (the same weekdays in the 4 weeks before).
  let weekVsUsual: { thisWeek: number; usual: number; pct: number | null } | null = null;
  if (isCurrent) {
    const dow = (eat.getUTCDay() + 6) % 7; // Monday = 0
    const sum = (offsetWeeks: number) => {
      let s = 0;
      for (let i = 0; i <= dow; i++) s += byDay[iso(new Date(Date.UTC(nowY, nowM, nowD - dow + i - 7 * offsetWeeks)))] || 0;
      return s;
    };
    const thisWeek = sum(0);
    const usual = (sum(1) + sum(2) + sum(3) + sum(4)) / 4;
    weekVsUsual = { thisWeek, usual, pct: pct(thisWeek, usual) };
  }

  // Receivables by age.
  const today0 = new Date(`${todayISO}T00:00:00Z`).getTime();
  const recvItems = (recv as any[]).map(r => {
    const age = r.invoice_date ? Math.max(0, Math.floor((today0 - new Date(r.invoice_date).getTime()) / DAY)) : 0;
    return { id: r.id, ref: r.booking_ref, invoice: r.invoice_number, customer: r.customer, amount: num(r.paid_amount), age };
  }).sort((a, b) => b.age - a.age);
  const receivables = {
    total: recvItems.reduce((s, r) => s + r.amount, 0),
    count: recvItems.length,
    b0: recvItems.filter(r => r.age <= 7).reduce((s, r) => s + r.amount, 0),
    b1: recvItems.filter(r => r.age > 7 && r.age <= 30).reduce((s, r) => s + r.amount, 0),
    b2: recvItems.filter(r => r.age > 30).reduce((s, r) => s + r.amount, 0),
    items: recvItems.slice(0, 5),
  };
  for (const r of recvItems.filter(r => r.age >= 7).slice(0, 3)) {
    attention.push({
      id: `ar-${r.id}`, tone: r.age >= 14 ? "bad" : "warn", money: true,
      title: `${r.ref} unpaid ${r.age} days`, detail: `${r.customer || "Customer"} · ${r.invoice || "Invoice"} · ${tzs(r.amount)}`,
      href: `/admin/bookings?open=${r.id}&do=pay`, cta: "Record payment",
    });
  }

  // Vehicles: what each one earned, what it cost, how often it worked.
  const perVeh: Record<number, { rev: number; cost: number; set: Set<number> }> = {};
  for (const r of bvRows as any[]) {
    const e = (perVeh[r.vehicle_id] ||= { rev: 0, cost: 0, set: new Set<number>() });
    e.rev += num(r.paid_amount) / Math.max(1, r.n);
    e.cost += num(r.fuel_cost) + num(r.driver_allowance) + num(r.emergency_cost) + num(r.owner_payout_amount);
    const s = new Date(r.pickup_datetime).getTime() + 3 * 3600000;
    const eRaw = r.end_dt ? new Date(r.end_dt).getTime() + 3 * 3600000 : s;
    const first = Math.max(1, new Date(s).getUTCDate());
    const span = Math.max(0, Math.floor((new Date(Date.UTC(new Date(eRaw).getUTCFullYear(), new Date(eRaw).getUTCMonth(), new Date(eRaw).getUTCDate())).getTime() - Date.UTC(new Date(s).getUTCFullYear(), new Date(s).getUTCMonth(), new Date(s).getUTCDate())) / DAY));
    for (let i = 0; i <= span; i++) { const dd = first + i; if (dd <= elapsed) e.set.add(dd); }
  }
  const vehicles = (vehRows as any[]).map(v => {
    const e = perVeh[v.id] || { rev: 0, cost: 0, set: new Set<number>() };
    const profit = e.rev - e.cost;
    return {
      id: v.id as number, name: `${v.make} ${v.model}`, plate: (v.plate_number as string) || "", status: v.status as string,
      revenue: e.rev, cost: e.cost, profit, margin: e.rev > 0 ? (profit / e.rev) * 100 : null as number | null,
      days: e.set.size, util: Math.round((e.set.size / Math.max(1, elapsed)) * 100),
    };
  }).sort((a, b) => b.profit - a.profit);

  // A price that would reach the target margin for the weakest working car.
  let price: { name: string; current: number; suggested: number } | null = null;
  const weak = vehicles.filter(v => v.days > 0 && v.revenue > 0 && (v.margin ?? 100) < target).sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0))[0];
  if (weak) price = { name: weak.name, current: Math.round(weak.revenue / weak.days), suggested: Math.round(weak.cost / weak.days / (1 - target / 100)) };

  // Customers.
  const cust = (custRows as any[]).map(c => ({ name: c.full_name || "Customer", rev: num(c.rev), jobs: c.jobs as number, returning: !!c.is_returning }))
    .sort((a, b) => b.rev - a.rev);
  const custRev = cust.reduce((s, c) => s + c.rev, 0);
  const customers = {
    active: cust.length, returning: cust.filter(c => c.returning).length,
    top: cust[0] ? { name: cust[0].name, share: custRev > 0 ? Math.round((cust[0].rev / custRev) * 100) : 0 } : null,
  };

  // Biggest cost this month.
  const catTotals: Record<string, number> = {};
  for (const r of (expHist as any[]).filter(r => r.ym === cur.ym)) { const k = r.category || "other"; catTotals[k] = (catTotals[k] || 0) + num(r.amount); }
  const topCostEntry = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const topCost = topCostEntry ? { category: topCostEntry[0].replace(/_/g, " "), amount: topCostEntry[1] } : null;

  // ── Profit doctor: what is wrong, why it matters, what to do, what it is worth ──
  const pretty = (s: string) => s.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
  const services = (svcRows as any[]).map(s => ({ name: pretty(s.service), revenue: num(s.rev), jobs: s.jobs as number, share: cur.revenue > 0 ? Math.round((num(s.rev) / cur.revenue) * 100) : 0 }));
  const prevCat: Record<string, number> = {};
  for (const r of prevExp as any[]) { const k = r.category || "other"; prevCat[k] = (prevCat[k] || 0) + num(r.amount); }
  const costMoves = Object.entries(catTotals).map(([k, v]) => ({ key: k, name: pretty(k), now: v, before: prevCat[k] || 0 }))
    .sort((a, b) => b.now - a.now);
  const endedTotal = (attnEnded as any[]).reduce((s, b) => s + num(b.quoted_amount), 0);
  const endedCount = (attnEnded as any[]).length;
  const T = target;
  const rev = cur.revenue;
  const findings: Finding[] = [];
  const ev = (label: string, value: string) => ({ label, value });

  if (rev > 0 && margin < T) {
    const gap = T - margin;
    findings.push({
      id: "margin", severity: cur.net < 0 || margin < T / 2 ? "critical" : "warning",
      title: `You keep ${Math.round(margin)}% of each sale; your target is ${T}%`,
      what: `Of every TZS 100 you earn, about TZS ${Math.round((cur.vehicleCosts / rev) * 100)} goes on trip costs, TZS ${Math.round((cur.companyCosts / rev) * 100)} on company costs, and TZS ${Math.round(margin)} is left as profit.`,
      why: `Each margin point is worth ${tzs(rev / 100)} on this month's revenue. Closing the ${Math.round(gap)}-point gap is worth about ${tzs((rev * gap) / 100)}.`,
      actions: ["Fix the prices of the cars listed under the price fixes below first.", "Look at the biggest cost lines below and ask what can be cut or negotiated.", "Quote new jobs from the cost per day, not from habit."],
      impact: (rev * gap) / 100,
      evidence: [ev("Margin now", `${Math.round(margin)}%`), ev("Target", `${T}%`), ev("Worth per 1 point", tzs(rev / 100))],
    });
  }
  if (rev > 0 && cur.vehicleCosts / rev > 0.45) {
    const top = costMoves.filter(c => isVehicleCost({ category: c.key }))[0];
    findings.push({
      id: "tripcost", severity: "warning",
      title: `Trip costs take ${Math.round((cur.vehicleCosts / rev) * 100)}% of revenue`,
      what: `Fuel, driver allowances and the other costs of running trips come to ${tzs(cur.vehicleCosts)} against ${tzs(rev)} earned.${top ? ` The biggest line is ${top.name.toLowerCase()} at ${tzs(top.now)}.` : ""}`,
      why: "Trip costs move with every job, so they are the cheapest place to find money when margin is thin.",
      actions: ["Compare fuel used per kilometre between cars and look for the outlier.", "Set a standard allowance per day for each type of trip.", "Make sure the client is billed for fuel and allowances where the quote allows it."],
      impact: cur.vehicleCosts - rev * 0.4,
      evidence: [ev("Trip costs", tzs(cur.vehicleCosts)), ev("Share of revenue", `${Math.round((cur.vehicleCosts / rev) * 100)}%`), ev("Healthy range", "under 40%")],
    });
  }
  if (rev > 0 && cur.companyCosts / rev > 0.3 && (!isCurrent || elapsed >= days * 0.6)) {
    findings.push({
      id: "overheads", severity: "warning",
      title: `Company costs are ${Math.round((cur.companyCosts / rev) * 100)}% of revenue`,
      what: `Rent, salaries, licences and other overheads came to ${tzs(cur.companyCosts)}. They are paid whether or not the cars are out.`,
      why: "Overheads are fixed, so the way to shrink their share is more jobs on the same cars, not cutting what keeps the business running.",
      actions: ["Fill the idle days (see below) before touching overheads.", "Check periodic costs such as insurance and licences are not being counted twice."],
      impact: cur.companyCosts - rev * 0.25,
      evidence: [ev("Company costs", tzs(cur.companyCosts)), ev("Share of revenue", `${Math.round((cur.companyCosts / rev) * 100)}%`)],
    });
  }
  for (const c of costMoves.filter(c => c.before > 0 && c.now > c.before * 1.3 && c.now - c.before >= Math.max(200000, rev * 0.03)).slice(0, 2)) {
    findings.push({
      id: `cost-${c.key}`, severity: "warning",
      title: `${c.name} is up ${Math.round(((c.now - c.before) / c.before) * 100)}% on ${isCurrent ? "the same days in " : ""}${prevLabel}`,
      what: `You have spent ${tzs(c.now)} on ${c.name.toLowerCase()} against ${tzs(c.before)} ${isCurrent ? "in the same days" : "in"} ${prevLabel}.`,
      why: "A cost that jumps without more work behind it is usually a price change, a leak or a one-off. Each is worth knowing about now.",
      actions: [`Open the ${c.name.toLowerCase()} entries and check each one is real and was billed at the right price.`, "If it is a one-off, note it so it is not mistaken for the new normal."],
      impact: c.now - c.before,
      evidence: [ev("This month", tzs(c.now)), ev(prevLabel, tzs(c.before))],
    });
  }
  if (receivables.b2 > 0 || (receivables.total > 0 && receivables.total > rev * 0.5)) {
    const worst = recvItems.slice(0, 3).map(r => `${r.customer || r.ref} (${short(r.amount)}, ${r.age} days)`).join(", ");
    findings.push({
      id: "receivables", severity: receivables.b2 > 0 ? "critical" : "warning",
      title: `${tzs(receivables.total)} is waiting to be paid`,
      what: `${receivables.count} invoice${receivables.count === 1 ? "" : "s"} unpaid${receivables.b2 > 0 ? `, ${tzs(receivables.b2)} of it older than 30 days` : ""}. Oldest: ${worst}.`,
      why: "Money owed is not money you can use. The older an invoice gets, the less likely it is paid in full, and unpaid jobs still cost you fuel, allowances and wages.",
      actions: ["Call the three oldest customers today and agree a payment date.", "Ask for a deposit on new jobs from customers who pay late.", "Record each payment the day it arrives so this list stays honest."],
      impact: receivables.b2 > 0 ? receivables.b2 : receivables.b1,
      items: recvItems.slice(0, 8).map(r => ({ label: `${r.customer || "Customer"} · ${r.invoice || r.ref}`, value: `${tzs(r.amount)} · ${r.age} days`, href: `/admin/bookings?open=${r.id}&do=docs` })),
      evidence: [ev("Unpaid", tzs(receivables.total)), ev("Over 30 days", tzs(receivables.b2)), ev("8 to 30 days", tzs(receivables.b1))],
    });
  }
  if (endedCount > 0) {
    findings.push({
      id: "uninvoiced", severity: "warning",
      title: `${endedCount} finished job${endedCount === 1 ? " has" : "s have"} not been invoiced`,
      what: `${endedCount === 1 ? "A job has" : `${endedCount} jobs have`} ended with no invoice recorded${endedTotal > 0 ? `, together quoted at ${tzs(endedTotal)}` : ""}.`,
      why: "The payment clock only starts when the invoice goes out. Every day of delay is a day later that cash arrives.",
      actions: ["Record the invoice for each finished job today.", "Make invoicing part of closing a job, not a separate chore."],
      impact: endedTotal > 0 ? endedTotal : null,
      items: (attnEnded as any[]).slice(0, 8).map(b => ({ label: `${b.booking_ref} · ${b.customer || "Customer"}`, value: num(b.quoted_amount) ? tzs(num(b.quoted_amount)) : "no quote", href: `/admin/bookings?open=${b.id}&do=invoice` })),
      evidence: [ev("Jobs waiting", String(endedCount)), ev("Quoted value", endedTotal > 0 ? tzs(endedTotal) : "not quoted")],
    });
  }
  const weakCars = vehicles.filter(v => v.days > 0 && v.revenue > 0 && (v.margin ?? 100) < T)
    .map(v => ({ v, cur: v.revenue / v.days, sug: v.cost / v.days / (1 - T / 100) }))
    .map(x => ({ ...x, gain: Math.max(0, x.sug - x.cur) * x.v.days })).filter(x => x.gain > 0).sort((a, b) => b.gain - a.gain).slice(0, 2);
  for (const x of weakCars) {
    findings.push({
      id: `car-${x.v.id}`, severity: (x.v.margin ?? 0) < T / 2 ? "warning" : "info",
      title: `${x.v.name} earns ${Math.round(x.v.margin ?? 0)}% margin, below your ${T}%`,
      what: `It worked ${x.v.days} of ${elapsed} days, earned ${tzs(x.v.revenue)} and cost ${tzs(x.v.cost)} to run on trips.`,
      why: "A car that works a lot but keeps little is the easiest to fix: the price, not the work, is the problem.",
      actions: [`Quote about TZS ${Math.round(x.sug).toLocaleString("en-US")} a day for it instead of ${Math.round(x.cur).toLocaleString("en-US")}.`, "Check its fuel and allowance lines for anything unusual."],
      impact: x.gain,
      items: [{ label: `${x.v.name} ${x.v.plate}`, value: `TZS ${Math.round(x.cur).toLocaleString("en-US")} → TZS ${Math.round(x.sug).toLocaleString("en-US")} a day`, href: `/admin/fleet?vehicle=${x.v.id}` }],
      evidence: [ev("Days worked", `${x.v.days} of ${elapsed}`), ev("Earned per day", tzs(x.cur)), ev("Needed per day", tzs(x.sug))],
    });
  }
  const idleCars = vehicles.filter(v => v.status !== "maintenance" && v.util < 30);
  const workedDays = vehicles.reduce((s, v) => s + v.days, 0);
  if (isCurrent && elapsed >= 7 && idleCars.length && workedDays > 0) {
    const perDay = vehicles.reduce((s, v) => s + v.revenue, 0) / workedDays;
    const idleDays = idleCars.reduce((s, v) => s + (elapsed - v.days), 0);
    findings.push({
      id: "idle", severity: "info",
      title: `${idleCars.map(v => v.name).slice(0, 2).join(" and ")} ${idleCars.length === 1 ? "is" : "are"} idle most days`,
      what: `${idleCars.length === 1 ? "It has" : "They have"} worked under 30% of the ${elapsed} days so far, about ${idleDays} idle car-days.`,
      why: "A car that is not working still carries insurance, licences and depreciation. Every idle day is revenue that never arrives.",
      actions: ["Offer idle cars to regular customers such as schools, hotels and companies for weekday transfers.", "Check whether a document or repair is keeping a car off the road."],
      impact: Math.round(idleDays * perDay * 0.3),
      items: idleCars.map(v => ({ label: `${v.name} ${v.plate}`, value: `worked ${v.days} of ${elapsed} days`, href: `/admin/fleet?vehicle=${v.id}` })),
      evidence: [ev("Idle car-days", String(idleDays)), ev("Average earned per working day", tzs(perDay)), ev("Estimate assumes", "30% of idle days filled")],
    });
  }
  if (customers.top && customers.active >= 3 && customers.top.share >= 40) {
    findings.push({
      id: "concentration", severity: "warning",
      title: `${customers.top.name} is ${customers.top.share}% of this month's revenue`,
      what: `One customer brings a large share of your income this month.`,
      why: "If they delay payment or go elsewhere, a big part of the month disappears with them.",
      actions: ["Keep this customer happy and paid up to date.", "Bring one or two more regular customers to a similar size over the next months."],
      impact: null,
      evidence: [ev("Top customer", customers.top.name), ev("Share of revenue", `${customers.top.share}%`)],
    });
  }
  if (customers.active >= 4 && customers.returning / customers.active < 0.3) {
    findings.push({
      id: "repeat", severity: "info",
      title: `Only ${customers.returning} of ${customers.active} customers had hired before`,
      what: "Most of this month's work came from new names rather than repeat customers.",
      why: "Repeat customers cost almost nothing to win and usually pay more reliably.",
      actions: ["Follow up each new customer within a week of the job.", "Offer regulars a standing arrangement such as a monthly airport-transfer rate."],
      impact: null, evidence: [ev("Returning", `${customers.returning} of ${customers.active}`)],
    });
  }
  if (forecast && isCurrent && prevNet > 0 && forecast.net < prevNet * 0.8) {
    findings.push({
      id: "pace", severity: "warning",
      title: `${p0label(y, m)} is on pace to finish below ${prevLabel}`,
      what: `At the current pace profit closes near ${tzs(forecast.net)} against ${tzs(prevNet)} last month.`,
      why: "There is still time to change the month, but bookings take days to arrange.",
      actions: ["Chase quotes that have not been confirmed yet.", "Look at the next two weeks and fill empty days with short transfer jobs."],
      impact: prevNet - forecast.net,
      evidence: [ev("Forecast", tzs(forecast.net)), ev(prevLabel, tzs(prevNet))],
    });
  }
  if (rev > 0 && margin >= T) {
    findings.push({ id: "healthy", severity: "good", title: `Margin is ${Math.round(margin)}%, above your ${T}% target`, what: `You keep TZS ${Math.round(margin)} of every TZS 100 earned after all costs.`, why: "This is the number that decides whether growth is worth chasing.", actions: ["Protect it: keep quoting from cost per day."], impact: null, evidence: [ev("Margin", `${Math.round(margin)}%`), ev("Target", `${T}%`)] });
  }
  if (cur.revenue > 0 && prevRevenue > 0 && cur.revenue > prevRevenue * 1.1) {
    findings.push({ id: "up", severity: "good", title: `Revenue is up ${Math.round(((cur.revenue - prevRevenue) / prevRevenue) * 100)}% on ${isCurrent ? "the same days in " : ""}${prevLabel}`, what: `${tzs(cur.revenue)} against ${tzs(prevRevenue)}.`, why: "More work is coming in. Check costs keep pace so it turns into profit.", actions: ["Keep the sources of this work going: note which customers and services drove it."], impact: null, evidence: [ev("Now", tzs(cur.revenue)), ev(prevLabel, tzs(prevRevenue))] });
  }
  const sevOrder = { critical: 0, warning: 1, info: 2, good: 3 } as const;
  findings.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || (b.impact || 0) - (a.impact || 0));
  findings.filter(f => f.severity !== "good" && (f.impact || 0) > 0).sort((a, b) => (b.impact || 0) - (a.impact || 0)).slice(0, 3).forEach(f => { f.fixFirst = true; });
  const priceFixes = vehicles.filter(v => v.days > 0 && v.revenue > 0 && (v.margin ?? 100) < T).map(v => {
    const perDay = v.revenue / v.days, costDay = v.cost / v.days, sug = costDay / (1 - T / 100);
    return { id: v.id, name: v.name, plate: v.plate, perDay, costDay, margin: v.margin, suggested: sug, extra: Math.max(0, sug - perDay) * v.days };
  }).sort((a, b) => b.extra - a.extra);
  const dailySeries = Array.from({ length: elapsed }, (_, i) => {
    const k = iso(new Date(Date.UTC(y, m, i + 1)));
    return { day: i + 1, revenue: byDay[k] || 0, jobs: jobsByDay[k] || 0 };
  });
  const drivers = (drvRows2 as any[]).map(d => ({ name: d.name as string, trips: d.trips as number, revenue: num(d.rev), share: rev > 0 ? Math.round((num(d.rev) / rev) * 100) : 0 }));
  const jobs = (jobRows as any[]).map(b => ({
    id: b.id as number, ref: b.booking_ref as string, date: b.pickup_datetime, customer: b.customer || "", service: pretty(b.service_type || "other"),
    amount: num(b.paid_amount) || num(b.quoted_amount),
    state: b.status === "cancelled" ? "Cancelled" : b.payment_status === "paid" ? "Paid" : b.invoice_number ? "Invoiced, unpaid" : "Not invoiced",
  }));
  const quick: { tone: "good" | "bad" | "info"; title: string; text: string }[] = [];
  if (prevRevenue > 0) { const c = Math.round(((rev - prevRevenue) / prevRevenue) * 100); quick.push({ tone: c >= 0 ? "good" : "bad", title: `Revenue ${c >= 0 ? "increased" : "fell"} by ${Math.abs(c)}%`, text: `Compared to ${isCurrent ? "the same days in " : ""}${prevLabel}.` }); }
  if (services[0]) quick.push({ tone: "info", title: `${services[0].name} is your top service`, text: `${services[0].jobs} job${services[0].jobs === 1 ? "" : "s"}, ${services[0].share}% of revenue.` });
  if (vehicles[0] && vehicles[0].days > 0) quick.push({ tone: "info", title: `${vehicles[0].name} is your most profitable car`, text: `${tzs(vehicles[0].profit)} profit, worked ${vehicles[0].days} of ${elapsed} days.` });
  if (receivables.total > 0) quick.push({ tone: "bad", title: `${tzs(receivables.total)} still unpaid`, text: `${receivables.count} invoice${receivables.count === 1 ? "" : "s"} waiting.` });
  const docsSoon = attention.filter(a => a.id.startsWith("vd-") || a.id.startsWith("dd-")).length;
  if (docsSoon) quick.push({ tone: "bad", title: `${docsSoon} document${docsSoon === 1 ? "" : "s"} expiring within 14 days`, text: "See Compliance before the next trip." });
  const summary = rev > 0 ? { trip: (cur.vehicleCosts / rev) * 100, company: (cur.companyCosts / rev) * 100, profit: (cur.net / rev) * 100 } : null;
  const doctor = {
    findings: findings.filter(f => f.severity !== "good").slice(0, 8).concat(findings.filter(f => f.severity === "good").slice(0, 2)),
    totalImpact: findings.filter(f => f.severity !== "good" && f.id !== "margin" && f.id !== "pace" && f.impact).reduce((s, f) => s + (f.impact || 0), 0),
  };
  const comparison = {
    label: prevLabel, sameDays: isCurrent,
    rows: [
      { name: "Revenue", now: cur.revenue, before: prevRevenue, lowerIsBetter: false },
      { name: "Trip costs", now: cur.vehicleCosts, before: prevVeh, lowerIsBetter: true },
      { name: "Company costs", now: cur.companyCosts, before: prevCo, lowerIsBetter: true },
      { name: "Profit", now: cur.net, before: prevNet, lowerIsBetter: false },
      { name: "Jobs", now: cur.jobs, before: num((prevRev as any[])[0]?.jobs), lowerIsBetter: false },
    ],
  };

  const order = { bad: 0, warn: 1, info: 2 } as const;
  attention.sort((a, b) => order[a.tone] - order[b.tone]);
  const attentionTop = attention.slice(0, 8);

  const result = {
    period: { year: y, month: m, label: labelOf(y, m), elapsed, days, isCurrent },
    target, attention: attentionTop, attentionTotal: attention.length,
    money: {
      revenue: cur.revenue, vehicleCosts: cur.vehicleCosts, companyCosts: cur.companyCosts, net: cur.net, margin, jobs: cur.jobs,
      prev: { label: prevLabel, revenue: prevRevenue, net: prevNet, margin: prevMargin },
      revenueDelta: pct(cur.revenue, prevRevenue), netDelta: prevNet > 0 ? pct(cur.net, prevNet) : null,
      cumulative, history, direction, forecast, weekVsUsual, receivables, vehicles, customers, price, topCost, services, costMoves: costMoves.slice(0, 5), doctor, comparison, priceFixes, dailySeries, drivers, jobList: jobs, quick, summary,
    },
    analysis: null as null | { paragraphs: Seg[][]; actions: string[] },
  };
  result.analysis = narrate(result);
  return result;
}

type Built = Awaited<ReturnType<typeof buildInsights>>;

// Turns the numbers into the paragraphs a business adviser would write: what
// happened, where the money came from, what it cost, how the cars did, what is
// still owed, where the month is heading, and what to do first.
function narrate(r: any): { paragraphs: Seg[][]; actions: string[] } {
  const mo = r.money, p = r.period;
  const paragraphs: Seg[][] = [];
  const when = p.isCurrent ? `${p.label} so far` : p.label;

  if (mo.revenue <= 0 && mo.vehicleCosts + mo.companyCosts <= 0) {
    return { paragraphs: [[{ t: `There is no revenue or cost recorded for ${when} yet. Once bookings are invoiced and expenses are added, this page writes the analysis for you.` }]], actions: [] };
  }

  // 1. The headline.
  const p1: Seg[] = [{ t: "You earned " }, { t: tzs(mo.revenue), k: "g" }, { t: ` from ${mo.jobs} job${mo.jobs === 1 ? "" : "s"}` }];
  if (mo.revenueDelta !== null) {
    const up = mo.revenueDelta >= 0;
    p1.push({ t: `, ${up ? "up" : "down"} ` }, { t: `${Math.abs(Math.round(mo.revenueDelta))}%`, k: "b" },
      { t: ` on ${p.isCurrent ? "the same days in " : ""}${mo.prev.label} (${short(mo.prev.revenue)})` });
  }
  p1.push({ t: ". After trip and company costs your profit is " }, { t: tzs(mo.net), k: mo.net >= 0 ? "g" : "r" });
  if (mo.revenue > 0) {
    p1.push({ t: `, a ${Math.round(mo.margin)}% margin against your ${r.target}% target` });
    if (mo.prev.margin !== null) {
      const diff = Math.round(mo.margin - mo.prev.margin);
      if (diff !== 0) p1.push({ t: `. That is ${Math.abs(diff)} point${Math.abs(diff) === 1 ? "" : "s"} ${diff > 0 ? "better" : "worse"} than ${mo.prev.label}` });
    }
  }
  p1.push({ t: "." });
  if (mo.direction.key !== "unknown") p1.push({ t: ` Over the longer run the business is ${mo.direction.key === "growing" ? "growing" : mo.direction.key === "declining" ? "slowing" : "steady"}. ${mo.direction.text}` });
  paragraphs.push(p1);

  // 2. Where the money came from.
  if (mo.services.length) {
    const s = mo.services;
    const p2: Seg[] = [{ t: "Most of the work came from " }, { t: s[0].name, k: "a" }, { t: ` (${s[0].share}% of revenue, ${s[0].jobs} job${s[0].jobs === 1 ? "" : "s"})` }];
    if (s[1]) p2.push({ t: `, then ${s[1].name} (${s[1].share}%)` });
    if (s[2]) p2.push({ t: ` and ${s[2].name} (${s[2].share}%)` });
    p2.push({ t: ". " });
    if (mo.customers.active > 0) {
      p2.push({ t: `${mo.customers.active} customer${mo.customers.active === 1 ? "" : "s"} hired you, ${mo.customers.returning} of them returning` });
      if (mo.customers.top && mo.customers.active >= 2) p2.push({ t: `, and ${mo.customers.top.name} alone made up ${mo.customers.top.share}% of revenue` });
      p2.push({ t: "." });
    }
    paragraphs.push(p2);
  }

  // 3. What it cost.
  if (mo.vehicleCosts + mo.companyCosts > 0) {
    const p3: Seg[] = [];
    if (mo.revenue > 0) p3.push({ t: "Trip costs were " }, { t: tzs(mo.vehicleCosts), k: "b" }, { t: `, ${Math.round((mo.vehicleCosts / mo.revenue) * 100)}% of revenue, and company costs were ` }, { t: tzs(mo.companyCosts), k: "b" }, { t: `, ${Math.round((mo.companyCosts / mo.revenue) * 100)}%. ` });
    else p3.push({ t: `Costs so far are ${tzs(mo.vehicleCosts + mo.companyCosts)} with no revenue to match yet. ` });
    const top = mo.costMoves[0];
    if (top) {
      p3.push({ t: `The biggest line is ${top.name.toLowerCase()} at ${tzs(top.now)}` });
      if (top.before > 0) {
        const ch = Math.round(((top.now - top.before) / top.before) * 100);
        if (Math.abs(ch) >= 5) p3.push({ t: `, ${ch > 0 ? "up" : "down"} ${Math.abs(ch)}% on ${p.isCurrent ? "the same days in " : ""}${mo.prev.label}` });
      }
      p3.push({ t: "." });
    }
    paragraphs.push(p3);
  }

  // 4. The cars.
  const worked = mo.vehicles.filter((v: any) => v.days > 0);
  if (worked.length) {
    const best = worked[0];
    const p4: Seg[] = [{ t: `The ${best.name} carried ${p.isCurrent ? "the month" : "it"}: it earned ` }, { t: `${tzs(best.profit)} profit`, k: "a" }, { t: ` and worked ${best.days} of ${p.elapsed} days.` }];
    const weakest = [...worked].filter((v: any) => v.margin !== null).sort((a: any, b: any) => a.margin - b.margin)[0];
    if (worked.length > 1 && weakest && weakest.id !== best.id && weakest.margin < r.target) {
      p4.push({ t: ` The ${weakest.name} is the weak spot at a ${Math.round(weakest.margin)}% margin (earned ${short(weakest.revenue)}, cost ${short(weakest.cost)}).` });
    }
    const idle = mo.vehicles.filter((v: any) => v.util < 30 && v.status !== "maintenance");
    if (idle.length && p.isCurrent && p.elapsed >= 7) p4.push({ t: ` ${idle.map((v: any) => v.name).slice(0, 2).join(" and ")} ${idle.length === 1 ? "has" : "have"} worked on under 30% of days.` });
    paragraphs.push(p4);
  }

  // 5. Money still to collect, and where the month is heading.
  const p5: Seg[] = [];
  if (mo.receivables.total > 0) {
    p5.push({ t: "Money is the risk. " }, { t: `${tzs(mo.receivables.total)} is still unpaid`, k: "r" });
    if (mo.receivables.b2 > 0) p5.push({ t: `, ${short(mo.receivables.b2)} of it more than 30 days old` });
    p5.push({ t: ". " });
  }
  if (mo.forecast) {
    p5.push({ t: `At this pace ${p.label.split(" ")[0]} closes near ` }, { t: tzs(mo.forecast.net), k: "b" }, { t: " profit" });
    if (mo.prev.net > 0) p5.push({ t: ` compared with ${short(mo.prev.net)} for the whole of ${mo.prev.label}` });
    p5.push({ t: ". " });
  }
  if (mo.weekVsUsual && mo.weekVsUsual.pct !== null) p5.push({ t: `This week is ${Math.abs(Math.round(mo.weekVsUsual.pct))}% ${mo.weekVsUsual.pct >= 0 ? "ahead of" : "behind"} a usual week.` });
  if (p5.length) paragraphs.push(p5);

  // What to do first: the doctor's findings, biggest money first.
  const todo = (mo.doctor.findings as Finding[]).filter(f => f.severity !== "good").slice(0, 5)
    .map(f => `${f.actions[0]}${f.impact && f.impact > 0 ? ` Worth about ${tzs(f.impact)}.` : ""} (${f.title})`);
  return { paragraphs, actions: todo };
}

export type Insights = Built;
