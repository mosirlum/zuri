import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireSession, isGuardFailure } from "@/lib/guards";
import { buildInsights } from "@/lib/insights";
import { logError } from "@/lib/error-log";
import { buildAttention, buildAvailability, buildMonth, buildOwed, detectIntent, langOf, type FleetState } from "@/lib/helper-ai";

export const dynamic = "force-dynamic";

// The helper's live questions. It only ever reads. Anything about money is for the owner,
// the same rule as the Reports and Business Growth pages: a staff member who asks gets a polite "no".
const TZ = "Africa/Dar_es_Salaam";
const atTime = (v: unknown) => (v ? new Date(v as string).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : undefined);
const atDay = (v: unknown) => (v ? new Date(v as string).toLocaleString("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : undefined);

// the same rule as the Dashboard, Fleet and Drivers pages, so the helper can never disagree with them
const CUR = (col: "vehicle_id" | "driver_id") => `
  SELECT b.booking_ref, COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime + INTERVAL '1 day') AS ends_at
  FROM booking_vehicles bv JOIN bookings b ON b.id = bv.booking_id
  WHERE bv.${col} = X.id AND b.status <> 'cancelled' AND b.pickup_datetime IS NOT NULL AND b.pickup_datetime <= NOW()
    AND COALESCE(b.return_datetime, b.dropoff_datetime, b.pickup_datetime + INTERVAL '1 day') >= NOW()
  ORDER BY b.pickup_datetime DESC LIMIT 1`;
const NXT = (col: "vehicle_id" | "driver_id") => `
  SELECT b.booking_ref, b.pickup_datetime AS leaves_at
  FROM booking_vehicles bv JOIN bookings b ON b.id = bv.booking_id
  WHERE bv.${col} = X.id AND b.status <> 'cancelled' AND b.pickup_datetime > NOW()
    AND b.pickup_datetime < (date_trunc('day', NOW() AT TIME ZONE 'Africa/Dar_es_Salaam') + INTERVAL '1 day') AT TIME ZONE 'Africa/Dar_es_Salaam'
  ORDER BY b.pickup_datetime ASC LIMIT 1`;

async function fleetState(): Promise<{ vehicles: FleetState[]; drivers: FleetState[] }> {
  const vq = `SELECT X.id, X.make, X.model, X.plate_number, X.status, c.booking_ref AS cur_ref, c.ends_at, n.booking_ref AS nxt_ref, n.leaves_at
    FROM vehicles X LEFT JOIN LATERAL (${CUR("vehicle_id")}) c ON true LEFT JOIN LATERAL (${NXT("vehicle_id")}) n ON true ORDER BY X.make, X.model`;
  const dq = `SELECT X.id, X.full_name, X.status, c.booking_ref AS cur_ref, c.ends_at, n.booking_ref AS nxt_ref, n.leaves_at
    FROM drivers X LEFT JOIN LATERAL (${CUR("driver_id")}) c ON true LEFT JOIN LATERAL (${NXT("driver_id")}) n ON true ORDER BY X.full_name`;
  const [v, d] = await Promise.all([sql.query(vq), sql.query(dq)]);
  const state = (r: any, off: boolean): Pick<FleetState, "state" | "ref" | "when"> =>
    off ? { state: "off" } : r.cur_ref ? { state: "out", ref: r.cur_ref, when: atDay(r.ends_at) } : r.nxt_ref ? { state: "leaving", ref: r.nxt_ref, when: atTime(r.leaves_at) } : { state: "free" };
  return {
    vehicles: (v as any[]).map((r) => ({ name: `${r.make} ${r.model}${r.plate_number ? ` (${r.plate_number})` : ""}`, ...state(r, r.status === "maintenance") })),
    drivers: (d as any[]).map((r) => ({ name: r.full_name, ...state(r, r.status === "leave") })),
  };
}

export async function POST(req: Request) {
  const g = await requireSession();
  if (isGuardFailure(g)) return NextResponse.json({ ok: false, kind: "error", text: "Please log in again." }, { status: 401 });
  const isBoss = (g.session.user as any)?.role === "super_admin";
  let text = "";
  try {
    text = String(((await req.json()) as { text?: unknown }).text ?? "").slice(0, 300);
  } catch {
    return NextResponse.json({ ok: false, kind: "error", text: "I could not read that." }, { status: 400 });
  }
  const lang = langOf(text);
  const sw = lang === "sw";
  const intent = detectIntent(text);
  const ownerOnly = () => NextResponse.json({ ok: true, kind: "deny", lang, text: sw ? "Hilo ni la mmiliki tu. Pesa na faida huonekana na Ray pekee." : "That one is for the owner only. Money and profit are only shown to Ray." });

  try {
    if (intent === "availability") {
      const f = await fleetState();
      const a = buildAvailability(lang, f.vehicles, f.drivers);
      return NextResponse.json({ ok: true, kind: "availability", lang, text: a.title, lines: a.lines, page: { href: "/admin", label: "Dashboard" } });
    }
    if (intent === "attention") {
      const d = await buildInsights({ money: isBoss });
      const items = d.attention.filter((a) => isBoss || !a.money);
      const a = buildAttention(lang, items, isBoss && "attentionTotal" in d ? d.attentionTotal : items.length);
      return NextResponse.json({ ok: true, kind: "attention", lang, text: a.title, lines: a.lines, page: a.first ?? { href: "/admin", label: "Dashboard" } });
    }
    if (intent === "analysis" || intent === "owed") {
      if (!isBoss) return ownerOnly();
      const d = await buildInsights({ money: true });
      if (!("money" in d)) return ownerOnly();
      const m = d.money;
      if (intent === "owed") {
        const o = buildOwed(lang, m.receivables.total, m.receivables.count, m.receivables.items);
        return NextResponse.json({ ok: true, kind: "owed", lang, text: o.title, lines: o.lines, page: { href: "/admin/bookings", label: "Bookings" } });
      }
      const a = buildMonth(lang, {
        label: d.period.label, isCurrent: d.period.isCurrent, elapsed: d.period.elapsed, days: d.period.days, target: d.target,
        revenue: m.revenue, vehicleCosts: m.vehicleCosts, companyCosts: m.companyCosts, net: m.net, margin: m.margin, jobs: m.jobs,
        prevLabel: m.prev.label, prevRevenue: m.prev.revenue, prevNet: m.prev.net,
        forecastNet: m.forecast ? m.forecast.net : null,
        receivablesTotal: m.receivables.total, receivablesCount: m.receivables.count,
        oldest: null,
        // the Profit Doctor's findings are written in English, so Swahili answers point to the full report instead
        findings: sw ? [] : m.doctor.findings.filter((f) => f.severity === "critical" || f.severity === "warning").slice(0, 3).map((f) => `${f.title}. ${f.what}`),
      });
      if (sw) a.lines.push("Kwa uchambuzi kamili wa kila tatizo na cha kurekebisha, fungua Reports.");
      return NextResponse.json({ ok: true, kind: "analysis", lang, text: a.title, lines: a.lines, page: { href: "/admin/reports", label: "Reports" } });
    }
    return NextResponse.json({ ok: true, kind: "none", lang });
  } catch (err) {
    await logError("api/admin/helper", err);
    return NextResponse.json({ ok: false, kind: "error", lang, text: sw ? "Samahani, nimeshindwa kupata namba sasa hivi. Jaribu tena." : "Sorry, I couldn't get the numbers just now. Please try again." }, { status: 500 });
  }
}
