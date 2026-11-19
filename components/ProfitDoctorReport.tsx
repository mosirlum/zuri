"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, Stethoscope, TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Info, ChevronLeft, ChevronRight } from "lucide-react";
import FindingCard from "@/components/FindingCard";
import { full, short } from "@/lib/money-rules";

type Seg = { t: string; k?: "g" | "r" | "a" | "b" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const tone: Record<string, string> = { g: "bg-green-100 text-green-800", r: "bg-red-100 text-red-800", a: "bg-gold/15 text-gold-deep", b: "font-semibold text-ink" };
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const TZS = (n: number) => `TZS ${full(n)}`;
const palette = ["#b8843a", "#d6a85a", "#8a5f24", "#c9b99a", "#6f6252", "#e2cfa8"];

function Card({ title, sub, children, className = "" }: { title?: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-ink/10 bg-paper p-6 ${className}`}>
      {title && <h3 className="font-display text-xl font-medium text-ink">{title}</h3>}
      {sub && <p className="text-sm text-muted mb-4">{sub}</p>}
      {!sub && title && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Kpi({ label, value, now, before, lowerIsBetter, money = true }: { label: string; value: number; now?: number; before?: number; lowerIsBetter?: boolean; money?: boolean }) {
  let delta: React.ReactNode = null;
  if (before !== undefined && now !== undefined && before !== 0) {
    const ch = Math.round(((now - before) / Math.abs(before)) * 100);
    const good = lowerIsBetter ? ch <= 0 : ch >= 0;
    delta = <span className={`text-sm font-semibold ${good ? "text-green-700" : "text-red-700"}`}>{ch > 0 ? "+" : ""}{ch}% <span className="font-normal text-muted">vs previous period</span></span>;
  }
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="font-display text-2xl lg:text-[1.7rem] font-medium text-ink mt-1 tabular-nums">{money ? TZS(value) : value.toLocaleString("en-US")}</div>
      <div className="mt-1 min-h-[1.25rem]">{delta}</div>
    </div>
  );
}

function DailyChart({ data, monthIdx }: { data: { day: number; revenue: number; jobs: number }[]; monthIdx: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <p className="text-sm text-muted">No days yet.</p>;
  const W = 720, H = 240, pl = 48, pr = 34, pt = 14, pb = 28;
  const maxR = Math.max(...data.map(d => d.revenue), 1) * 1.15;
  const maxJ = Math.max(...data.map(d => d.jobs), 1) + 1;
  const bw = (W - pl - pr) / data.length;
  const Y = (v: number) => pt + (H - pt - pb) * (1 - v / maxR);
  const YJ = (v: number) => pt + (H - pt - pb) * (1 - v / maxJ);
  const line = data.map((d, i) => `${pl + i * bw + bw / 2},${YJ(d.jobs)}`).join(" L");
  const ticks = [0, 0.5, 1].map(f => maxR / 1.15 * f);
  const step = Math.max(1, Math.ceil(data.length / 6));
  const h = hover !== null ? data[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daily revenue and jobs" onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} stroke="#1c1814" strokeOpacity=".08" />
            <text x={pl - 8} y={Y(t) + 4} textAnchor="end" fontSize="12" fill="#695e50">{short(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.day} onMouseEnter={() => setHover(i)}>
            <rect x={pl + i * bw} y={pt} width={bw} height={H - pt - pb} fill="transparent" />
            <rect x={pl + i * bw + bw * 0.18} y={Y(d.revenue)} width={bw * 0.64} height={H - pb - Y(d.revenue)} rx="3"
              fill={hover === i ? "#8a5f24" : "#d6a85a"} style={{ transformOrigin: `0 ${H - pb}px`, animation: `zgrow .7s ${i * 15}ms cubic-bezier(.2,.7,.2,1) both` }} />
          </g>
        ))}
        <path d={`M${line}`} fill="none" stroke="#1c1814" strokeWidth="2" strokeOpacity=".75" strokeLinejoin="round" pointerEvents="none" />
        {data.map((d, i) => i % step === 0 || i === data.length - 1 ? (
          <text key={d.day} x={pl + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="#695e50">{String(d.day).padStart(2, "0")} {MONTHS[monthIdx]}</text>
        ) : null)}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-2 right-2 rounded-xl bg-ink text-paper text-sm px-3 py-2 shadow-lg">
          <div className="font-semibold">{h.day} {MONTHS[monthIdx]}</div>
          <div>{TZS(h.revenue)}</div>
          <div className="text-paper/70">{h.jobs} job{h.jobs === 1 ? "" : "s"}</div>
        </div>
      )}
      <div className="flex gap-5 text-sm text-muted mt-2">
        <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-sm bg-[#d6a85a]" /> Revenue (TZS)</span>
        <span className="inline-flex items-center gap-2"><i className="w-4 h-0.5 bg-ink/70" /> Jobs</span>
      </div>
    </div>
  );
}

function ShareList({ rows, total }: { rows: { name: string; value: number; sub?: string }[]; total: number }) {
  return (
    <div>
      <div className="flex h-3.5 rounded-full overflow-hidden gap-0.5">
        {rows.map((r, i) => <i key={r.name} style={{ width: `${total > 0 ? Math.max((r.value / total) * 100, 1.5) : 0}%`, background: palette[i % palette.length] }} />)}
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-sm flex-none" style={{ background: palette[i % palette.length] }} />
            <span className="flex-1 min-w-0 truncate text-ink">{r.name}{r.sub && <span className="text-muted text-sm"> · {r.sub}</span>}</span>
            <b className="tabular-nums">{total > 0 ? `${((r.value / total) * 100).toFixed(1)}%` : "-"}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The owner's report, modelled on the Profit Doctor report the Feed Fusion
// system gives: what you earned and kept, what to fix and what it is worth,
// then the detail behind it. Everything comes from /api/admin/insights.
export default function ProfitDoctorReport({ year, month }: { year: number; month: number }) {
  const [d, setD] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let live = true;
    setD(null); setFailed(false); setPage(0);
    fetch(`/api/admin/insights?year=${year}&month=${month}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(x => { if (live) setD(x); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [year, month]);

  const jobs = useMemo(() => d?.money?.jobList || [], [d]);
  if (failed) return <p className="text-sm text-red-700">Could not load the Profit Doctor report. Refresh to try again.</p>;
  if (!d) return <div className="space-y-4"><div className="h-64 rounded-3xl bg-ink/5 animate-pulse" /><div className="h-40 rounded-3xl bg-ink/5 animate-pulse" /></div>;
  const m = d.money;
  if (!m) return null;

  const T = d.target;
  const healthy = m.revenue > 0 && m.margin >= T;
  const periodText = `1 ${MONTHS[month]} ${year} – ${d.period.elapsed} ${MONTHS[month]} ${year}`;
  const findings = m.doctor.findings as any[];
  const problems = findings.filter(f => f.severity !== "good");
  const cmp = Object.fromEntries(m.comparison.rows.map((r: any) => [r.name, r]));
  const perPage = 10;
  const pages = Math.max(1, Math.ceil(jobs.length / perPage));
  const shown = jobs.slice(page * perPage, page * perPage + perPage);
  const a = m && d.analysis;

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const fRows = problems.map((f: any) => `<div class="f"><h3>${esc(f.title)}${f.impact ? ` <span>≈ TZS ${full(f.impact)}</span>` : ""}</h3><p><b>What is happening.</b> ${esc(f.what)}</p><p><b>Why it matters.</b> ${esc(f.why)}</p><ol>${f.actions.map((x: string) => `<li>${esc(x)}</li>`).join("")}</ol>${(f.items || []).length ? `<table>${f.items.map((it: any) => `<tr><td>${esc(it.label)}</td><td>${esc(it.value)}</td></tr>`).join("")}</table>` : ""}</div>`).join("");
    const pf = m.priceFixes.length ? `<h2>Prices to correct</h2><table><tr><th>Vehicle</th><th>Earned / day</th><th>Cost / day</th><th>Margin</th><th>Suggested / day</th><th>Extra profit</th></tr>${m.priceFixes.map((p: any) => `<tr><td>${esc(p.name)}</td><td>${full(p.perDay)}</td><td>${full(p.costDay)}</td><td>${Math.round(p.margin)}%</td><td>${full(p.suggested)}</td><td>${full(p.extra)}</td></tr>`).join("")}</table>` : "";
    const words = a ? `<h2>In plain words</h2>${a.paragraphs.map((p: Seg[]) => `<p>${p.map(s => (s.k ? `<b>${esc(s.t)}</b>` : esc(s.t))).join("")}</p>`).join("")}` : "";
    w.document.write(`<!doctype html><title>Profit Doctor ${esc(d.period.label)}</title><style>body{font:15px/1.6 Georgia,serif;max-width:760px;margin:36px auto;padding:0 20px;color:#1c1814}h1{font-size:26px;margin:0}h2{font-size:18px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:4px}h3{font-size:16px;margin:18px 0 4px}h3 span{color:#8a5f24}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border-bottom:1px solid #eee;padding:5px 6px;text-align:left;font-size:13px}.s td:last-child{text-align:right}small{color:#695e50}</style>
<h1>Zuri Tours &amp; Car Hire · Profit Doctor</h1><small>${esc(periodText)}</small>
<table class="s"><tr><td>Money you earned from jobs</td><td>${TZS(m.revenue)}</td></tr><tr><td>Spent running the trips</td><td>${TZS(m.vehicleCosts)}</td></tr><tr><td>Company costs</td><td>${TZS(m.companyCosts)}</td></tr><tr><td><b>What is left for you (profit)</b></td><td><b>${TZS(m.net)}</b></td></tr></table>
${m.doctor.totalImpact > 0 ? `<p><b>Money you can win back: about TZS ${full(m.doctor.totalImpact)}</b> if you fix the points below.</p>` : ""}${fRows}${pf}${words}`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-6 z-stagger">
      {/* Headline */}
      <section className="rounded-3xl border border-ink/10 bg-paper overflow-hidden">
        <div className="bg-gradient-to-br from-[#1c1814] via-[#2b2118] to-[#5a3d17] text-paper px-6 sm:px-8 py-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-medium flex items-center gap-3"><Stethoscope className="w-7 h-7 text-gold" /> Profit Doctor: {healthy ? "how healthy is your profit?" : "why is my profit small?"}</h2>
            <p className="text-paper/70 mt-1">{periodText}{d.period.isCurrent ? " (month so far)" : ""}</p>
          </div>
          <button onClick={print} className="inline-flex items-center gap-2 rounded-xl bg-paper/10 hover:bg-paper/20 px-4 py-2.5 text-sm font-medium transition-colors"><Printer className="w-4 h-4" /> Print / Save PDF</button>
        </div>
        <div className="px-6 sm:px-8 py-6">
          <dl className="divide-y divide-ink/10 text-base">
            {[
              ["Money you earned from jobs", m.revenue, null],
              ["Spent running the trips (fuel, allowances, borrowed cars…)", m.vehicleCosts, m.summary?.trip],
              ["Company costs (rent, salaries, licences…)", m.companyCosts, m.summary?.company],
            ].map(([l, v, p]) => (
              <div key={l as string} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="text-ink-soft">{l as string}</dt>
                <dd className="font-semibold tabular-nums">{TZS(v as number)}{p !== null && p !== undefined ? <span className="text-muted font-normal"> ({(p as number).toFixed(1)}% of revenue)</span> : null}</dd>
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
              <dt className="font-semibold text-ink">What is left for you (profit)</dt>
              <dd className={`font-display text-2xl tabular-nums ${m.net < 0 ? "text-red-700" : "text-ink"}`}>{TZS(m.net)}{m.summary && <span className="text-base text-muted font-sans"> ({m.summary.profit.toFixed(1)}%)</span>}</dd>
            </div>
          </dl>
          {m.summary && (
            <p className="mt-4 rounded-2xl bg-paper-soft px-5 py-4 text-ink-soft leading-relaxed">
              Example: when a customer pays you <b>TZS 100</b>, about <b>TZS {Math.round(m.summary.trip)}</b> goes on running the trip, <b>TZS {Math.round(m.summary.company)}</b> pays company costs and you keep about <b className={m.net < 0 ? "text-red-700" : "text-green-800"}>TZS {Math.round(m.summary.profit)}</b>. Margin {Math.round(m.margin)}%, target {T}%.
            </p>
          )}
        </div>
      </section>

      {/* Win back */}
      {m.doctor.totalImpact > 0 && (
        <section className="rounded-3xl bg-gold/10 border border-gold/25 px-6 sm:px-8 py-6">
          <div className="text-sm tracking-widest uppercase text-gold-deep font-semibold">Money you can win back</div>
          <div className="font-display text-3xl sm:text-4xl text-ink mt-1">About TZS {full(m.doctor.totalImpact)} <span className="text-lg text-muted">in this period</span></div>
          <p className="text-ink-soft mt-1">If you fix the points below. Estimates assume the same amount of work after the changes.</p>
        </section>
      )}

      {/* Findings */}
      <div className="space-y-3">
        {problems.length === 0 && <div className="rounded-2xl border border-ink/10 bg-paper p-6 text-ink-soft">Nothing needs fixing in this period. Costs, prices and collections all look healthy.</div>}
        {problems.map((f: any) => <FindingCard key={f.id} f={f} defaultOpen />)}
        {findings.filter((f: any) => f.severity === "good").map((f: any) => <FindingCard key={f.id} f={f} />)}
      </div>

      {/* Prices to correct */}
      {m.priceFixes.length > 0 && (
        <Card title="Prices to correct" sub={`Suggested price = what the car costs to run per working day + a ${T}% margin. Use it when you quote the next job.`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-base">
              <thead><tr className="text-left text-sm text-muted"><th className="pb-2 font-medium">Vehicle</th><th className="pb-2 font-medium text-right">Earned / day</th><th className="pb-2 font-medium text-right">Cost / day</th><th className="pb-2 font-medium text-right">Margin</th><th className="pb-2 font-medium text-right">Suggested / day</th><th className="pb-2 font-medium text-right">Extra profit</th></tr></thead>
              <tbody>
                {m.priceFixes.map((p: any) => (
                  <tr key={p.name + p.plate} className="border-t border-ink/10">
                    <td className="py-3"><b>{p.name}</b> <span className="text-muted text-sm">{p.plate}</span></td>
                    <td className="py-3 text-right tabular-nums">{TZS(p.perDay)}</td>
                    <td className="py-3 text-right tabular-nums">{TZS(p.costDay)}</td>
                    <td className="py-3 text-right"><span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-sm font-semibold">{Math.round(p.margin)}%</span></td>
                    <td className="py-3 text-right tabular-nums font-semibold">{TZS(p.suggested)}</td>
                    <td className="py-3 text-right tabular-nums text-green-800 font-semibold">{TZS(p.extra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* In plain words */}
      {a && (
        <Card title="In plain words">
          <div className="max-w-3xl">
            {a.paragraphs.map((p: Seg[], i: number) => (
              <p key={i} className="text-base leading-8 text-ink-soft mb-4">
                {p.map((s, j) => s.k ? <span key={j} className={`${s.k === "b" ? "" : "px-1.5 py-0.5 rounded-md font-medium"} ${tone[s.k]}`}>{s.t}</span> : <span key={j}>{s.t}</span>)}
              </p>
            ))}
            {a.actions.length > 0 && (
              <>
                <div className="text-sm tracking-widest uppercase text-muted mt-2 mb-3">What to do first</div>
                <ol className="space-y-3">
                  {a.actions.map((x: string, i: number) => (
                    <li key={i} className="flex gap-3 text-ink-soft"><span className="flex-none w-7 h-7 rounded-full bg-gold/15 text-gold-deep text-sm font-semibold grid place-items-center">{i + 1}</span><span className="pt-0.5 leading-relaxed">{x}</span></li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Kpi label="Total revenue" value={m.revenue} now={cmp.Revenue?.now} before={cmp.Revenue?.before} />
        <Kpi label="Trip costs" value={m.vehicleCosts} now={cmp["Trip costs"]?.now} before={cmp["Trip costs"]?.before} lowerIsBetter />
        <Kpi label="Company costs" value={m.companyCosts} now={cmp["Company costs"]?.now} before={cmp["Company costs"]?.before} lowerIsBetter />
        <Kpi label="Net profit" value={m.net} now={cmp.Profit?.now} before={cmp.Profit?.before} />
        <Kpi label="Jobs" value={m.jobs} money={false} now={cmp.Jobs?.now} before={cmp.Jobs?.before} />
        <Kpi label="Still unpaid" value={m.receivables.total} />
      </div>

      <Card title="Revenue overview" sub="Daily revenue and jobs. Hover a day to see its numbers.">
        <DailyChart data={m.dailySeries} monthIdx={month} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Revenue by service" sub={`Share of ${TZS(m.revenue)}`}>
          {m.services.length ? <ShareList rows={m.services.map((s: any) => ({ name: s.name, value: s.revenue, sub: `${s.jobs} job${s.jobs === 1 ? "" : "s"}` }))} total={m.revenue} /> : <p className="text-muted">No jobs yet.</p>}
        </Card>
        <Card title="Revenue by driver" sub="Who drove the jobs (a job with two cars is split between them)">
          {m.drivers.length ? <ShareList rows={m.drivers.map((r: any) => ({ name: r.name, value: r.revenue, sub: `${r.trips} trip${r.trips === 1 ? "" : "s"}` }))} total={m.drivers.reduce((s: number, r: any) => s + r.revenue, 0)} /> : <p className="text-muted">No drivers assigned to jobs yet.</p>}
        </Card>
      </div>

      <Card title="Top 5 vehicles" sub="By what each car earned this period">
        <ol className="space-y-3">
          {[...m.vehicles].sort((x: any, y: any) => y.revenue - x.revenue).filter((v: any) => v.revenue > 0).slice(0, 5).map((v: any, i: number) => (
            <li key={v.id} className="flex items-center gap-4 rounded-2xl bg-paper-soft px-4 py-3">
              <span className="w-8 h-8 rounded-full bg-ink text-paper grid place-items-center font-semibold">{i + 1}</span>
              <div className="flex-1 min-w-0"><div className="font-medium text-ink truncate">{v.name} <span className="text-muted text-sm">{v.plate}</span></div><div className="text-sm text-muted">worked {v.days} day{v.days === 1 ? "" : "s"} · {v.margin !== null ? `${Math.round(v.margin)}% margin` : "no revenue"}</div></div>
              <b className="tabular-nums">{TZS(v.revenue)}</b>
            </li>
          ))}
          {m.vehicles.every((v: any) => v.revenue <= 0) && <p className="text-muted">No vehicle earned yet in this period.</p>}
        </ol>
      </Card>

      <Card title="Jobs in this period" sub={`${jobs.length} job${jobs.length === 1 ? "" : "s"}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-base">
            <thead><tr className="text-left text-sm text-muted"><th className="pb-2 font-medium">Booking</th><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Customer</th><th className="pb-2 font-medium">Service</th><th className="pb-2 font-medium text-right">Amount</th><th className="pb-2 font-medium">Status</th></tr></thead>
            <tbody>
              {shown.map((j: any) => (
                <tr key={j.id} className="border-t border-ink/10">
                  <td className="py-3 font-mono text-sm">{j.ref}</td>
                  <td className="py-3">{j.date ? new Date(j.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}</td>
                  <td className="py-3">{j.customer || "-"}</td>
                  <td className="py-3">{j.service}</td>
                  <td className="py-3 text-right tabular-nums font-semibold">{TZS(j.amount)}</td>
                  <td className="py-3"><span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${j.state === "Paid" ? "bg-green-100 text-green-800" : j.state === "Cancelled" ? "bg-ink/5 text-muted" : j.state === "Not invoiced" ? "bg-gold/15 text-gold-deep" : "bg-red-100 text-red-800"}`}>{j.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-muted">Showing {shown.length} of {jobs.length}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-lg border border-ink/15 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              <span>Page {page + 1} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="p-2 rounded-lg border border-ink/15 disabled:opacity-40" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </Card>

      {m.quick.length > 0 && (
        <Card title="Quick insights">
          <ul className="grid sm:grid-cols-2 gap-3">
            {m.quick.map((q: any, i: number) => {
              const Icon = q.tone === "good" ? TrendingUp : q.tone === "bad" ? (q.title.includes("fell") ? TrendingDown : AlertTriangle) : q.title.includes("car") ? Lightbulb : Info;
              return (
                <li key={i} className="flex gap-3 rounded-2xl bg-paper-soft px-4 py-3">
                  <Icon className={`w-5 h-5 flex-none mt-0.5 ${q.tone === "good" ? "text-green-700" : q.tone === "bad" ? "text-red-700" : "text-gold"}`} />
                  <div><div className="font-medium text-ink">{q.title}</div><div className="text-sm text-muted">{q.text}</div></div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
