"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import CountUp from "@/components/CountUp";
import { short } from "@/lib/money-rules";

const toneBar: Record<string, string> = { bad: "bg-red-500", warn: "bg-gold", info: "bg-green-600" };

function Area({ values, days }: { values: number[]; days: number }) {
  if (values.length < 2) return <div className="h-32 grid place-items-center text-xs text-muted">The line appears after the second day.</div>;
  const W = 600, H = 150, pl = 8, pb = 6, pt = 10;
  const max = Math.max(...values, 1) * 1.1;
  const X = (i: number) => pl + ((W - pl * 2) * i) / (days - 1);
  const Y = (v: number) => pt + (H - pt - pb) * (1 - v / max);
  const pts = values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" role="img" aria-label="Revenue through the month">
      <defs>
        <linearGradient id="dgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8843a" stopOpacity=".35" /><stop offset="1" stopColor="#b8843a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M${X(0)},${H - pb} L${pts.join(" L")} L${X(last)},${H - pb}Z`} fill="url(#dgrad)" />
      <path d={`M${pts.join(" L")}`} fill="none" stroke="#b8843a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "zdraw 1.4s .1s cubic-bezier(.2,.7,.2,1) forwards" }} />
      <circle cx={X(last)} cy={Y(values[last])} r="5" fill="#b8843a" stroke="#faf7f1" strokeWidth="2" />
    </svg>
  );
}

export default function DashboardInsights({ isBoss }: { isBoss: boolean }) {
  const [d, setD] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/insights").then(r => (r.ok ? r.json() : Promise.reject())).then(setD).catch(() => setFailed(true));
  }, []);

  if (failed) return null;
  if (!d) return <div className="grid lg:grid-cols-2 gap-4"><div className="h-56 rounded-2xl bg-ink/5 animate-pulse" /><div className="h-56 rounded-2xl bg-ink/5 animate-pulse" /></div>;

  const m = d.money;
  const att: any[] = d.attention || [];
  const rec = m?.receivables;

  return (
    <div className="space-y-4 z-stagger">
      {isBoss && m && (
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
          <div className="rounded-2xl border border-ink/10 bg-paper p-6">
            <div className="text-xs tracking-widest uppercase text-muted">Profit this month</div>
            <div className={`font-display text-5xl lg:text-6xl font-medium mt-1 ${m.net < 0 ? "text-red-600" : "text-ink"}`}>
              {m.net < 0 ? "-" : ""}<CountUp value={Math.abs(m.net)} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {m.netDelta !== null ? (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${m.netDelta >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {m.netDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {Math.abs(Math.round(m.netDelta))}%
                  <span className="font-normal">vs {d.period.isCurrent ? "same days in " : ""}{m.prev.label}</span>
                </span>
              ) : <span className="text-muted">No earlier month to compare yet</span>}
              {m.forecast && <span className="text-muted">Pace: closes near <b className="text-ink">TZS {short(m.forecast.net)}</b></span>}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[["Revenue", m.revenue], ["Trip costs", m.vehicleCosts], ["Company costs", m.companyCosts]].map(([l, v]) => (
                <div key={l as string}>
                  <div className="text-[0.65rem] tracking-widest uppercase text-muted">{l as string}</div>
                  <div className="font-display text-2xl mt-0.5"><CountUp value={v as number} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-paper p-6">
            <div className="text-xs tracking-widest uppercase text-muted mb-2">Revenue through {d.period.label.split(" ")[0]}</div>
            <Area values={m.cumulative} days={d.period.days} />
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${isBoss && rec ? "lg:grid-cols-[1.6fr_1fr]" : ""}`}>
        <div className="rounded-2xl border border-ink/10 bg-paper p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-medium">Needs your attention</h2>
            {d.attentionTotal > 0 && <span className="text-xs text-muted">{d.attentionTotal} item{d.attentionTotal === 1 ? "" : "s"}</span>}
          </div>
          {att.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-muted">Nothing needs you right now. Documents are valid, jobs are staffed and invoices are in.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {att.map(a => (
                <li key={a.id} className="relative flex items-center gap-3 rounded-xl bg-paper-soft pl-5 pr-3 py-3 overflow-hidden transition-transform hover:translate-x-0.5">
                  <span className={`absolute left-0 inset-y-0 w-1 ${toneBar[a.tone]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink">{a.title}</div>
                    <div className="text-xs text-muted truncate">{a.detail}</div>
                  </div>
                  <Link href={a.href} className="flex-none inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-ink/15 bg-paper hover:border-gold hover:text-gold transition-colors">
                    {a.cta} <ArrowRight className="w-3 h-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isBoss && rec && (
          <div className="rounded-2xl border border-ink/10 bg-paper p-6">
            <div className="text-xs tracking-widest uppercase text-muted">Money owed to you</div>
            <div className="font-display text-4xl mt-1"><CountUp value={rec.total} /></div>
            <div className="text-xs text-muted">{rec.count} unpaid invoice{rec.count === 1 ? "" : "s"}</div>
            {rec.total > 0 && (
              <>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mt-4">
                  <i style={{ width: `${(rec.b0 / rec.total) * 100}%`, background: "#16a34a" }} />
                  <i style={{ width: `${(rec.b1 / rec.total) * 100}%`, background: "#b8843a" }} />
                  <i style={{ width: `${(rec.b2 / rec.total) * 100}%`, background: "#dc2626" }} />
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted">
                  <div className="flex justify-between"><span>0 to 7 days</span><b className="text-ink">{short(rec.b0)}</b></div>
                  <div className="flex justify-between"><span>8 to 30 days</span><b className="text-ink">{short(rec.b1)}</b></div>
                  <div className="flex justify-between"><span>Over 30 days</span><b className="text-ink">{short(rec.b2)}</b></div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
