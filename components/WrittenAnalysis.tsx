"use client";

import { useEffect, useState } from "react";
import { Printer, Sparkles } from "lucide-react";

type Seg = { t: string; k?: "g" | "r" | "a" | "b" };

const tone: Record<string, string> = {
  g: "bg-green-100 text-green-700",
  r: "bg-red-100 text-red-700",
  a: "bg-gold/15 text-gold-deep",
  b: "font-semibold text-ink",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The report an owner actually wants to read: what happened, why, and what to
// do about it, in sentences. Worked out on the server from the same numbers
// as the rest of the app.
export default function WrittenAnalysis({ year, month }: { year: number; month: number }) {
  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null); setFailed(false);
    fetch(`/api/admin/insights?year=${year}&month=${month}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (live) setData(d); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [year, month]);

  if (failed) return null;
  if (!data) return <div className="h-40 rounded-2xl bg-ink/5 animate-pulse" />;
  const a = data.analysis;
  if (!a) return null;

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const body = a.paragraphs.map((p: Seg[]) => `<p>${p.map(s => (s.k ? `<b>${esc(s.t)}</b>` : esc(s.t))).join("")}</p>`).join("");
    const todo = a.actions.length ? `<h2>What to do</h2><ol>${a.actions.map((x: string) => `<li>${esc(x)}</li>`).join("")}</ol>` : "";
    w.document.write(`<!doctype html><title>Zuri analysis ${esc(data.period.label)}</title>
<style>body{font:15px/1.7 Georgia,serif;max-width:680px;margin:40px auto;padding:0 20px;color:#1c1814}h1{font-size:28px;margin:0}small{color:#7a6f60}h2{font-size:16px;margin-top:28px;letter-spacing:.1em;text-transform:uppercase}li{margin:6px 0}</style>
<h1>Zuri Tours &amp; Car Hire</h1><small>Business analysis · ${esc(data.period.label)}${data.period.isCurrent ? " (to date)" : ""}</small><div style="margin-top:22px">${body}</div>${todo}`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <section className="rounded-2xl border border-ink/10 bg-paper overflow-hidden">
      <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold" /> Analysis: {data.period.label}{data.period.isCurrent ? " so far" : ""}
        </h2>
        <button onClick={print} className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-ink/15 hover:border-gold hover:text-gold transition-colors">
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </button>
      </div>
      <div className="px-6 py-5 max-w-3xl">
        {a.paragraphs.map((p: Seg[], i: number) => (
          <p key={i} className="text-[15px] leading-7 text-ink-soft mb-3">
            {p.map((s, j) => s.k
              ? <span key={j} className={`${s.k === "b" ? "" : "px-1.5 py-0.5 rounded-md font-medium"} ${tone[s.k]}`}>{s.t}</span>
              : <span key={j}>{s.t}</span>)}
          </p>
        ))}
        {a.actions.length > 0 && (
          <div className="mt-5">
            <div className="text-xs tracking-widest uppercase text-muted mb-2">What to do</div>
            <ol className="space-y-2">
              {a.actions.map((x: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-ink-soft">
                  <span className="flex-none w-6 h-6 rounded-full bg-gold/15 text-gold-deep text-xs font-semibold grid place-items-center">{i + 1}</span>
                  <span className="pt-0.5">{x}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
