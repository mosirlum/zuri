"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Lock, Lightbulb } from "lucide-react";
import CountUp from "@/components/CountUp";
import { short, full } from "@/lib/money-rules";

function Bars({ history }: { history: any[] }) {
  const W = 520, H = 200, pl = 8, pb = 26, pt = 22;
  const max = Math.max(...history.map(h => Math.max(h.net, 0)), 1) * 1.15;
  const bw = (W - pl) / history.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Profit by month">
      <defs>
        <pattern id="gh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#f1e3c8" /><line x1="0" y1="0" x2="0" y2="6" stroke="#b8843a" strokeWidth="2" />
        </pattern>
      </defs>
      <line x1={pl} x2={W} y1={H - pb} y2={H - pb} stroke="#1c1814" strokeOpacity=".12" />
      {history.map((h, i) => {
        const v = Math.max(h.net, 0);
        const bh = (H - pt - pb) * (v / max);
        const x = pl + i * bw + bw * 0.2;
        const y = H - pb - bh;
        return (
          <g key={h.ym}>
            <rect x={x} y={y} width={bw * 0.6} height={bh} rx="6" fill={h.partial ? "url(#gh)" : "#b8843a"} stroke={h.partial ? "#b8843a" : "none"}
              style={{ transformOrigin: `${x}px ${H - pb}px`, animation: `zgrow .8s ${i * 70}ms cubic-bezier(.2,.7,.2,1) both` }}>
              <title>{`${h.label}: ${h.net < 0 ? "-" : ""}TZS ${full(Math.abs(h.net))}${h.partial ? " (to date)" : ""}`}</title>
            </rect>
            <text x={x + bw * 0.3} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1c1814">{h.net < 0 ? "-" : ""}{short(Math.abs(h.net))}</text>
            <text x={x + bw * 0.3} y={H - 8} textAnchor="middle" fontSize="11" fill="#7a6f60">{h.label}{h.partial ? "*" : ""}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function GrowthPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [d, setD] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (role !== "super_admin") return;
    fetch("/api/admin/insights").then(r => (r.ok ? r.json() : Promise.reject())).then(setD).catch(() => setFailed(true));
  }, [role]);

  if (role && role !== "super_admin") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Lock className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-muted">Growth is for the boss only.</p>
      </div>
    );
  }
  if (failed) return <p className="text-sm text-red-600">Could not load growth. Refresh to try again.</p>;
  if (!d?.money) return <div className="space-y-4"><div className="h-9 w-48 rounded-lg bg-ink/5 animate-pulse" /><div className="h-40 rounded-2xl bg-ink/5 animate-pulse" /><div className="h-64 rounded-2xl bg-ink/5 animate-pulse" /></div>;

  const m = d.money;
  const dir = m.direction;
  const dirStyle = dir.key === "growing" ? { c: "text-green-600", bg: "from-green-50", Icon: TrendingUp, label: "Growing" }
    : dir.key === "declining" ? { c: "text-red-600", bg: "from-red-50", Icon: TrendingDown, label: "Slowing" }
    : dir.key === "steady" ? { c: "text-gold-deep", bg: "from-gold/10", Icon: Minus, label: "Steady" }
    : { c: "text-muted", bg: "from-ink/5", Icon: Minus, label: "Building history" };
  const topProfit = Math.max(...m.vehicles.map((v: any) => v.profit), 1);

  return (
    <div className="space-y-6 z-stagger">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">Growth</h1>
        <p className="text-muted text-sm mt-1">Where the business is heading, worked out from your own bookings and costs.</p>
      </div>

      <div className={`rounded-2xl border border-ink/10 bg-gradient-to-br ${dirStyle.bg} to-paper p-6 flex flex-wrap items-end justify-between gap-6`}>
        <div>
          <div className="text-xs tracking-widest uppercase text-muted">Direction</div>
          <div className={`font-display text-4xl lg:text-5xl font-medium flex items-center gap-3 ${dirStyle.c}`}><dirStyle.Icon className="w-9 h-9" /> {dirStyle.label}</div>
          <p className="text-sm text-ink-soft mt-1">{dir.text}</p>
        </div>
        {m.forecast && (
          <div className="sm:text-right">
            <div className="text-xs tracking-widest uppercase text-muted">Forecast for {d.period.label.split(" ")[0]}</div>
            <div className="font-display text-3xl lg:text-4xl"><span className="text-lg text-muted">TZS </span><CountUp value={m.forecast.net} /></div>
            <div className="text-xs text-muted">profit, if the current pace holds</div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <div className="rounded-2xl border border-ink/10 bg-paper p-6">
          <h2 className="font-display text-xl font-medium mb-3">Profit by month</h2>
          <Bars history={m.history} />
          <p className="text-xs text-muted mt-1">* {d.period.label.split(" ")[0]} to date, {d.period.elapsed} of {d.period.days} days</p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-paper p-6 space-y-6">
          {m.weekVsUsual && (
            <div>
              <h2 className="font-display text-xl font-medium mb-2">This week vs a usual week</h2>
              <div className="font-display text-3xl"><span className="text-base text-muted">TZS </span><CountUp value={m.weekVsUsual.thisWeek} /></div>
              <div className="text-xs text-muted">usual by today: {short(m.weekVsUsual.usual)}</div>
              {m.weekVsUsual.pct !== null && (
                <span className={`inline-block mt-2 rounded-full px-3 py-1 text-xs font-semibold ${m.weekVsUsual.pct >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {m.weekVsUsual.pct >= 0 ? "▲" : "▼"} {Math.abs(Math.round(m.weekVsUsual.pct))}% {m.weekVsUsual.pct >= 0 ? "ahead" : "behind"}
                </span>
              )}
            </div>
          )}
          <div>
            <h2 className="font-display text-xl font-medium mb-2">Customers</h2>
            <div className="flex justify-between text-sm py-1.5"><span className="text-muted">Active this month</span><b>{m.customers.active}</b></div>
            <div className="flex justify-between text-sm py-1.5 border-t border-ink/5"><span className="text-muted">Came back</span><b>{m.customers.returning} of {m.customers.active}</b></div>
            {m.customers.top && <div className="flex justify-between text-sm py-1.5 border-t border-ink/5"><span className="text-muted">Biggest customer</span><b className="text-right">{m.customers.top.name} · {m.customers.top.share}%</b></div>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-paper p-6">
        <h2 className="font-display text-xl font-medium mb-4">Which vehicles earn their keep</h2>
        {m.vehicles.length === 0 ? <p className="text-sm text-muted">No vehicles yet.</p> : (
          <div className="space-y-4">
            {m.vehicles.map((v: any) => (
              <div key={v.id}>
                <div className="flex flex-wrap justify-between gap-x-4 text-sm">
                  <span><b>{v.name}</b> <span className="text-muted">{v.plate}</span></span>
                  <span className="text-muted"><b className="text-ink">{v.profit < 0 ? "-" : ""}{full(Math.abs(v.profit))}</b>{v.margin !== null ? ` · ${Math.round(v.margin)}% margin` : ""} · worked {v.days} of {d.period.elapsed} days</span>
                </div>
                <div className="h-2 rounded-full bg-ink/5 mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(0, (v.profit / topProfit) * 100)}%`, transition: "width 1s cubic-bezier(.2,.7,.2,1)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {m.price && (
          <div className="mt-5 flex gap-3 rounded-xl bg-gold/10 border border-gold/20 p-4">
            <Lightbulb className="w-5 h-5 text-gold flex-none mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">{m.price.name}: below your {d.target}% target margin</div>
              <div className="text-ink-soft">To reach it at today's cost, quote about <b>TZS {full(m.price.suggested)}</b> a day instead of {full(m.price.current)}. Change the target in <Link href="/admin/settings" className="text-gold underline">Settings</Link>.</div>
            </div>
          </div>
        )}
        <p className="text-xs text-muted mt-4">Each car is credited its share of every job it worked and charged its own fuel, driver allowance and emergency costs. Company overheads are not split across cars.</p>
      </div>
    </div>
  );
}
