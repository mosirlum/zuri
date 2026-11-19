"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Lock, Lightbulb, Stethoscope, CheckCircle2 } from "lucide-react";
import CountUp from "@/components/CountUp";
import FindingCard from "@/components/FindingCard";
import { short, full } from "@/lib/money-rules";

function Bars({ history }: { history: any[] }) {
  const W = 520, H = 210, pl = 8, pb = 26, pt = 24;
  const max = Math.max(...history.map(h => Math.max(h.net, 0)), 1) * 1.15;
  const bw = (W - pl) / history.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Profit by month">
      <defs>
        <pattern id="gh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#f1e3c8" /><line x1="0" y1="0" x2="0" y2="6" stroke="#b8843a" strokeWidth="2" />
        </pattern>
        <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d49a45" /><stop offset="1" stopColor="#a87430" /></linearGradient>
      </defs>
      <line x1={pl} x2={W} y1={H - pb} y2={H - pb} stroke="#1c1814" strokeOpacity=".12" />
      {history.map((h, i) => {
        const v = Math.max(h.net, 0);
        const bh = (H - pt - pb) * (v / max);
        const x = pl + i * bw + bw * 0.18;
        const y = H - pb - bh;
        return (
          <g key={h.ym}>
            <rect x={x} y={y} width={bw * 0.64} height={bh} rx="8" fill={h.partial ? "url(#gh)" : "url(#gb)"} stroke={h.partial ? "#b8843a" : "none"}
              style={{ transformOrigin: `${x}px ${H - pb}px`, animation: `zgrow .8s ${i * 70}ms cubic-bezier(.2,.7,.2,1) both` }}>
              <title>{`${h.label}: ${h.net < 0 ? "-" : ""}TZS ${full(Math.abs(h.net))}${h.partial ? " (to date)" : ""}`}</title>
            </rect>
            <text x={x + bw * 0.32} y={y - 7} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1c1814">{h.net < 0 ? "-" : ""}{short(Math.abs(h.net))}</text>
            <text x={x + bw * 0.32} y={H - 8} textAnchor="middle" fontSize="11" fill="#7a6f60">{h.label}{h.partial ? "*" : ""}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Delta({ now, before, lowerIsBetter }: { now: number; before: number; lowerIsBetter?: boolean }) {
  if (!before) return <span className="text-xs text-muted">new</span>;
  const ch = ((now - before) / Math.abs(before)) * 100;
  if (Math.abs(ch) < 1) return <span className="text-xs text-muted">same</span>;
  const good = lowerIsBetter ? ch < 0 : ch > 0;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${good ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{ch > 0 ? "▲" : "▼"} {Math.abs(Math.round(ch))}%</span>;
}

function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-ink/10 bg-paper p-6 shadow-sm shadow-ink/[0.03] ${className}`}>
      {title && <h2 className="font-display text-xl font-medium mb-4">{title}</h2>}
      {children}
    </section>
  );
}

export default function BusinessGrowthPage() {
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
        <p className="text-muted">Business Growth is for the boss only.</p>
      </div>
    );
  }
  if (failed) return <p className="text-sm text-red-600">Could not load Business Growth. Refresh to try again.</p>;
  if (!d?.money) return <div className="space-y-4"><div className="h-52 rounded-3xl bg-ink/5 animate-pulse" /><div className="h-64 rounded-3xl bg-ink/5 animate-pulse" /><div className="h-64 rounded-3xl bg-ink/5 animate-pulse" /></div>;

  const m = d.money;
  const dir = m.direction;
  const DirIcon = dir.key === "growing" ? TrendingUp : dir.key === "declining" ? TrendingDown : Minus;
  const dirLabel = dir.key === "growing" ? "Growing" : dir.key === "declining" ? "Slowing down" : dir.key === "steady" ? "Holding steady" : "Building history";
  const topProfit = Math.max(...m.vehicles.map((v: any) => v.profit), 1);
  const progress = Math.round((d.period.elapsed / d.period.days) * 100);
  const marginPct = Math.max(0, Math.min(100, (m.margin / Math.max(d.target, 1)) * 100));
  const findings = m.doctor.findings as any[];
  const problems = findings.filter(f => f.severity !== "good");
  const wins = findings.filter(f => f.severity === "good");
  const tones = ["#d6a85a", "#b8843a", "#8a5f24", "#c9b99a", "#6f6252"];

  return (
    <div className="space-y-6 z-stagger">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1814] via-[#2b2118] to-[#5a3d17] text-paper p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-xs tracking-[0.25em] uppercase text-paper/60">Business Growth · {d.period.label}{d.period.isCurrent ? " so far" : ""}</div>
            <div className="mt-2 flex items-center gap-3 font-display text-4xl sm:text-5xl font-medium"><DirIcon className="w-9 h-9 text-gold" /> {dirLabel}</div>
            <p className="text-paper/70 text-sm mt-2 max-w-md">{dir.text}</p>
          </div>
          {m.forecast && (
            <div className="sm:text-right">
              <div className="text-xs tracking-[0.25em] uppercase text-paper/60">Forecast, month end</div>
              <div className="font-display text-3xl sm:text-4xl mt-1"><span className="text-lg text-paper/60">TZS </span><CountUp value={m.forecast.net} /></div>
              <div className="text-xs text-paper/60">profit if the pace holds</div>
            </div>
          )}
        </div>

        <div className="relative mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
            <div className="text-[0.65rem] tracking-widest uppercase text-paper/60">Profit</div>
            <div className="font-display text-2xl mt-1">{m.net < 0 ? "-" : ""}<CountUp value={Math.abs(m.net)} /></div>
            <div className="text-xs text-paper/60 mt-1">{m.netDelta !== null ? `${m.netDelta >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(m.netDelta))}% vs ${m.prev.label}` : "No earlier month to compare"}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
            <div className="text-[0.65rem] tracking-widest uppercase text-paper/60">Revenue</div>
            <div className="font-display text-2xl mt-1"><CountUp value={m.revenue} /></div>
            <div className="text-xs text-paper/60 mt-1">{m.revenueDelta !== null ? `${m.revenueDelta >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(m.revenueDelta))}% vs ${m.prev.label}` : `${m.jobs} jobs`}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
            <div className="text-[0.65rem] tracking-widest uppercase text-paper/60">Margin vs target {d.target}%</div>
            <div className="font-display text-2xl mt-1">{Math.round(m.margin)}%</div>
            <div className="h-1.5 rounded-full bg-white/15 mt-2.5 overflow-hidden"><div className="h-full rounded-full bg-gold" style={{ width: `${marginPct}%`, transition: "width 1s cubic-bezier(.2,.7,.2,1)" }} /></div>
          </div>
        </div>

        {d.period.isCurrent && (
          <div className="relative mt-5">
            <div className="flex justify-between text-xs text-paper/60 mb-1.5"><span>Day {d.period.elapsed} of {d.period.days}</span><span>{progress}% of the month</span></div>
            <div className="h-1.5 rounded-full bg-white/15 overflow-hidden"><div className="h-full rounded-full bg-paper/70" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
      </section>

      {/* Profit doctor */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display text-2xl font-medium flex items-center gap-2"><Stethoscope className="w-5 h-5 text-gold" /> Profit doctor</h2>
            <p className="text-sm text-muted">What the numbers say is wrong, why it matters and what to do. Biggest first.</p>
          </div>
          {m.doctor.totalImpact > 0 && (
            <span className="rounded-full bg-gold/15 text-gold-deep px-4 py-2 text-sm font-medium">About <b>TZS {short(m.doctor.totalImpact)}</b> to win back or protect</span>
          )}
        </div>
        {problems.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-paper p-8 text-center"><CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" /><p className="text-sm text-muted">Nothing is flagged. Costs, collections and pricing all look healthy for {d.period.label}.</p></div>
        ) : (
          <div className="space-y-3">{problems.map((f, i) => <FindingCard key={f.id} f={f} defaultOpen={i === 0} />)}</div>
        )}
        {wins.length > 0 && <div className="space-y-3 mt-3">{wins.map(f => <FindingCard key={f.id} f={f} />)}</div>}
      </section>

      {/* Comparison */}
      <Panel title={`This month against ${m.comparison.label}${m.comparison.sameDays ? " (same days)" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[460px]">
            <thead><tr className="text-left text-[0.65rem] tracking-widest uppercase text-muted"><th className="pb-2 font-medium">&nbsp;</th><th className="pb-2 font-medium text-right">Now</th><th className="pb-2 font-medium text-right">{m.comparison.label}</th><th className="pb-2 font-medium text-right">Change</th></tr></thead>
            <tbody>
              {m.comparison.rows.map((r: any) => (
                <tr key={r.name} className="border-t border-ink/5">
                  <td className="py-3 text-ink-soft">{r.name}</td>
                  <td className="py-3 text-right font-semibold tabular-nums">{r.name === "Jobs" ? r.now : full(r.now)}</td>
                  <td className="py-3 text-right text-muted tabular-nums">{r.name === "Jobs" ? r.before : full(r.before)}</td>
                  <td className="py-3 text-right"><Delta now={r.now} before={r.before} lowerIsBetter={r.lowerIsBetter} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <Panel title="Profit by month">
          <Bars history={m.history} />
          <p className="text-xs text-muted mt-1">* {d.period.label.split(" ")[0]} to date, {d.period.elapsed} of {d.period.days} days</p>
        </Panel>
        <Panel title="Where the work came from">
          {m.services.length === 0 ? <p className="text-sm text-muted">No jobs yet this month.</p> : (
            <>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {m.services.map((s: any, i: number) => <i key={s.name} style={{ width: `${Math.max(s.share, 2)}%`, background: tones[i % tones.length] }} title={`${s.name} ${s.share}%`} />)}
              </div>
              <ul className="mt-4 space-y-2">
                {m.services.map((s: any, i: number) => (
                  <li key={s.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: tones[i % tones.length] }} />
                    <span className="flex-1 text-ink-soft truncate">{s.name}</span>
                    <span className="text-muted text-xs">{s.jobs} job{s.jobs === 1 ? "" : "s"}</span>
                    <b className="tabular-nums w-14 text-right">{s.share}%</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {m.weekVsUsual && (
          <Panel title="This week against a usual week">
            <div className="font-display text-4xl"><span className="text-lg text-muted">TZS </span><CountUp value={m.weekVsUsual.thisWeek} /></div>
            <div className="text-sm text-muted mt-1">A usual week is {short(m.weekVsUsual.usual)} by this day.</div>
            {m.weekVsUsual.pct !== null && (
              <span className={`inline-block mt-3 rounded-full px-3 py-1 text-sm font-semibold ${m.weekVsUsual.pct >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {m.weekVsUsual.pct >= 0 ? "▲" : "▼"} {Math.abs(Math.round(m.weekVsUsual.pct))}% {m.weekVsUsual.pct >= 0 ? "ahead" : "behind"}
              </span>
            )}
          </Panel>
        )}
        <Panel title="Customers">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-paper-soft p-3"><div className="font-display text-3xl">{m.customers.active}</div><div className="text-xs text-muted mt-0.5">hired you</div></div>
            <div className="rounded-2xl bg-paper-soft p-3"><div className="font-display text-3xl">{m.customers.returning}</div><div className="text-xs text-muted mt-0.5">came back</div></div>
            <div className="rounded-2xl bg-paper-soft p-3"><div className="font-display text-3xl">{m.customers.top ? `${m.customers.top.share}%` : "-"}</div><div className="text-xs text-muted mt-0.5">biggest customer</div></div>
          </div>
          {m.customers.top && <p className="text-sm text-ink-soft mt-3">{m.customers.top.name} is your biggest customer this month.</p>}
        </Panel>
      </div>

      <Panel title="Which vehicles earn their keep">
        {m.vehicles.length === 0 ? <p className="text-sm text-muted">No vehicles yet.</p> : (
          <div className="space-y-4">
            {m.vehicles.map((v: any) => (
              <div key={v.id}>
                <div className="flex flex-wrap justify-between gap-x-4 text-sm">
                  <span><b>{v.name}</b> <span className="text-muted">{v.plate}</span></span>
                  <span className="text-muted"><b className="text-ink">{v.profit < 0 ? "-" : ""}{full(Math.abs(v.profit))}</b>{v.margin !== null ? ` · ${Math.round(v.margin)}% margin` : ""} · worked {v.days} of {d.period.elapsed} days</span>
                </div>
                <div className="h-2 rounded-full bg-ink/5 mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-gold to-[#d49a45]" style={{ width: `${Math.max(0, (v.profit / topProfit) * 100)}%`, transition: "width 1s cubic-bezier(.2,.7,.2,1)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {m.price && (
          <div className="mt-5 flex gap-3 rounded-2xl bg-gold/10 border border-gold/20 p-4">
            <Lightbulb className="w-5 h-5 text-gold flex-none mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">{m.price.name}: below your {d.target}% target margin</div>
              <div className="text-ink-soft">At today's cost, quote about <b>TZS {full(m.price.suggested)}</b> a day instead of {full(m.price.current)}. Change the target in <Link href="/admin/settings" className="text-gold underline">Settings</Link>.</div>
            </div>
          </div>
        )}
        <p className="text-xs text-muted mt-4">Each car is credited its share of every job it worked and charged its own fuel, driver allowance and emergency costs. Company overheads are not split across cars.</p>
      </Panel>
    </div>
  );
}
