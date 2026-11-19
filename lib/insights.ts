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
  const target = await getTargetMargin();

  const [vehRows, drvRows, attnEnded, attnNoDriver] = await Promise.all([
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
        WHERE b.status = 'confirmed' AND b.invoice_number IS NULL
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
        detail: v.plate_number || "Vehicle", href: "/admin/compliance", cta: "Open compliance",
      });
    }
    if (v.next_service_date) {
      const left = daysTo(v.next_service_date);
      if (left <= 10) attention.push({
        id: `sv-${v.id}`, tone: left <= 0 ? "bad" : "info",
        title: left <= 0 ? `${v.make} ${v.model} service is overdue` : `${v.make} ${v.model} service due in ${left} day${left === 1 ? "" : "s"}`,
        detail: v.plate_number || "Vehicle", href: "/admin/fleet", cta: "Open fleet",
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
        detail: "Driver", href: "/admin/compliance", cta: "Open compliance",
      });
    }
  }
  for (const b of attnNoDriver as any[]) {
    if (b.cars === 0 || b.no_driver > 0) {
      const hrs = Math.max(0, Math.round((new Date(b.pickup_datetime).getTime() - Date.now()) / 3600000));
      attention.push({
        id: `nd-${b.id}`, tone: hrs <= 24 ? "bad" : "warn",
        title: `${b.booking_ref} starts in ${hrs < 24 ? `${hrs}h` : `${Math.round(hrs / 24)} day${Math.round(hrs / 24) === 1 ? "" : "s"}`} with ${b.cars === 0 ? "no vehicle" : "no driver"} assigned`,
        detail: b.customer || "Booking", href: "/admin/bookings", cta: "Open booking",
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
        href: "/admin/bookings", cta: "Create invoice",
      });
    }
  }

  if (!opts.money) {
    const order = { bad: 0, warn: 1, info: 2 } as const;
    attention.sort((a, b) => order[a.tone] - order[b.tone]);
    return { period: { year: y, month: m, label: labelOf(y, m), elapsed, days, isCurrent }, target, attention: attention.slice(0, 8) };
  }

  // ── money (boss only) ───────────────────────────────────────────────────
  const [revHist, expHist, prevRev, prevExp, daily, recv, bvRows, custRows] = await Promise.all([
    sql`SELECT to_char(pickup_datetime::date, 'YYYY-MM') AS ym, COALESCE(SUM(paid_amount), 0) AS revenue, COUNT(*)::int AS jobs
        FROM bookings WHERE pickup_datetime::date BETWEEN ${hist0}::date AND ${endISO}::date GROUP BY 1`,
    sql`SELECT to_char(expense_date, 'YYYY-MM') AS ym, expense_type, category, COALESCE(SUM(amount), 0) AS amount
        FROM expenses WHERE expense_date BETWEEN ${hist0}::date AND ${endISO}::date GROUP BY 1, 2, 3`,
    sql`SELECT COALESCE(SUM(paid_amount), 0) AS revenue FROM bookings WHERE pickup_datetime::date BETWEEN ${prevStart}::date AND ${prevEnd}::date`,
    sql`SELECT expense_type, category, COALESCE(SUM(amount), 0) AS amount FROM expenses
        WHERE expense_date BETWEEN ${prevStart}::date AND ${prevEnd}::date GROUP BY 1, 2`,
    sql`SELECT pickup_datetime::date::text AS d, COALESCE(SUM(paid_amount), 0) AS rev FROM bookings
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
  ]);

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
  for (const r of daily as any[]) byDay[r.d] = num(r.rev);
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
      href: "/admin/bookings", cta: "Record payment",
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
      cumulative, history, direction, forecast, weekVsUsual, receivables, vehicles, customers, price, topCost,
    },
    analysis: null as null | { paragraphs: Seg[][]; actions: string[] },
  };
  result.analysis = narrate(result);
  return result;
}

type Built = Awaited<ReturnType<typeof buildInsights>>;

// Turns the numbers into the paragraphs a business adviser would write.
function narrate(r: any): { paragraphs: Seg[][]; actions: string[] } {
  const mo = r.money, p = r.period;
  const paragraphs: Seg[][] = [];
  const actions: string[] = [];
  const when = p.isCurrent ? `${p.label} so far` : p.label;

  if (mo.revenue <= 0 && mo.vehicleCosts + mo.companyCosts <= 0) {
    return { paragraphs: [[{ t: `There is no revenue or cost recorded for ${when} yet. Once bookings are invoiced and expenses are added, this page writes the analysis for you.` }]], actions: [] };
  }

  const p1: Seg[] = [{ t: "You earned " }, { t: tzs(mo.revenue), k: "g" }, { t: ` from ${mo.jobs} job${mo.jobs === 1 ? "" : "s"}` }];
  if (mo.revenueDelta !== null) {
    const up = mo.revenueDelta >= 0;
    p1.push({ t: `, ${up ? "up" : "down"} ` }, { t: `${Math.abs(Math.round(mo.revenueDelta))}%`, k: "b" },
      { t: ` on ${p.isCurrent ? "the same days in " : ""}${mo.prev.label} (${short(mo.prev.revenue)})` });
  }
  p1.push({ t: ". After trip and company costs your profit is " }, { t: tzs(mo.net), k: mo.net >= 0 ? "g" : "r" });
  if (mo.revenue > 0) {
    p1.push({ t: `, a ${Math.round(mo.margin)}% margin` });
    if (mo.prev.margin !== null) {
      const diff = Math.round(mo.margin - mo.prev.margin);
      if (diff !== 0) p1.push({ t: `, ${Math.abs(diff)} point${Math.abs(diff) === 1 ? "" : "s"} ${diff > 0 ? "better" : "worse"} than ${mo.prev.label}` });
    }
  }
  p1.push({ t: "." });
  paragraphs.push(p1);

  const worked = mo.vehicles.filter((v: any) => v.days > 0);
  if (worked.length) {
    const best = worked[0];
    const p2: Seg[] = [{ t: `The ${best.name} carried ${p.isCurrent ? "the month" : "it"}: it earned ` }, { t: `${tzs(best.profit)} profit`, k: "a" }, { t: ` and worked ${best.days} of ${p.elapsed} days.` }];
    const weakest = [...worked].filter((v: any) => v.margin !== null).sort((a: any, b: any) => a.margin - b.margin)[0];
    if (worked.length > 1 && weakest && weakest.id !== best.id && weakest.margin < r.target) {
      p2.push({ t: ` The ${weakest.name} is the weak spot at a ${Math.round(weakest.margin)}% margin (earned ${short(weakest.revenue)}, cost ${short(weakest.cost)}).` });
    }
    const idle = mo.vehicles.filter((v: any) => v.util < 30 && v.status !== "maintenance");
    if (idle.length && p.isCurrent && p.elapsed >= 7) p2.push({ t: ` ${idle.map((v: any) => v.name).slice(0, 2).join(" and ")} ${idle.length === 1 ? "has" : "have"} worked on under 30% of days.` });
    paragraphs.push(p2);
  }

  const p3: Seg[] = [];
  if (mo.receivables.total > 0) {
    p3.push({ t: "Money is the risk. " }, { t: `${tzs(mo.receivables.total)} is still unpaid`, k: "r" });
    if (mo.receivables.b2 > 0) p3.push({ t: `, ${short(mo.receivables.b2)} of it more than 30 days old` });
    p3.push({ t: ". " });
  }
  if (mo.forecast) p3.push({ t: `At this pace ${p.label} closes near ` }, { t: tzs(mo.forecast.net), k: "b" }, { t: " profit." });
  if (mo.revenue > 0 && mo.margin < r.target) {
    p3.push({ t: ` Your margin is under the ${r.target}% target${mo.topCost ? `; the biggest cost is ${mo.topCost.category} at ${short(mo.topCost.amount)}` : ""}.` });
  }
  if (p3.length) paragraphs.push(p3);

  // Things to do, taken from what the system already knows.
  const ar = mo.receivables.items.filter((x: any) => x.age >= 7).slice(0, 2);
  if (ar.length) actions.push(`Collect ${ar.map((x: any) => `${x.invoice || x.ref} (${x.customer || "customer"}, ${short(x.amount)})`).join(" and ")} this week.`);
  const ne = r.attention.filter((a: any) => a.id.startsWith("ne-"));
  if (ne.length) actions.push(`Invoice ${ne.length === 1 ? "the job" : `the ${ne.length} jobs`} that already ended: ${ne.slice(0, 2).map((a: any) => a.title.split(" ")[0]).join(", ")}.`);
  const docs = r.attention.filter((a: any) => a.id.startsWith("vd-") || a.id.startsWith("dd-")).slice(0, 1);
  if (docs.length) actions.push(`${docs[0].title.replace(/^./, (c: string) => c.toUpperCase())}. Renew before the next trip.`);
  if (mo.price) actions.push(`Quote about TZS ${mo.price.suggested.toLocaleString("en-US")} a day for the ${mo.price.name} instead of ${mo.price.current.toLocaleString("en-US")} to reach a ${r.target}% margin at today's cost.`);
  const idle = mo.vehicles.filter((v: any) => v.util < 30 && v.status !== "maintenance")[0];
  if (idle && p.isCurrent && p.elapsed >= 7) actions.push(`Find work for the ${idle.name}. It is idle most days.`);

  return { paragraphs, actions: actions.slice(0, 4) };
}

export type Insights = Built;
