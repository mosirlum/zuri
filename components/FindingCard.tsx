"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ChevronDown, ArrowUpRight } from "lucide-react";
import { short } from "@/lib/money-rules";

const look: Record<string, { bar: string; chip: string; label: string; Icon: any; tint: string }> = {
  critical: { bar: "bg-red-500", chip: "bg-red-100 text-red-700", label: "Act now", Icon: AlertOctagon, tint: "text-red-600" },
  warning: { bar: "bg-gold", chip: "bg-gold/15 text-gold-deep", label: "Needs attention", Icon: AlertTriangle, tint: "text-gold" },
  info: { bar: "bg-sky-500", chip: "bg-sky-100 text-sky-700", label: "Opportunity", Icon: Info, tint: "text-sky-600" },
  good: { bar: "bg-green-500", chip: "bg-green-100 text-green-700", label: "Going well", Icon: CheckCircle2, tint: "text-green-600" },
};

export type FindingData = {
  id: string; severity: "critical" | "warning" | "info" | "good"; title: string; what: string; why: string;
  actions: string[]; impact: number | null; evidence: { label: string; value: string }[];
  items?: { label: string; value: string; href?: string }[]; fixFirst?: boolean;
};

// One thing the system noticed, written the way an adviser would say it:
// what is happening, why it matters, what to do, and what it is worth.
export default function FindingCard({ f, defaultOpen = false }: { f: FindingData; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const s = look[f.severity];
  return (
    <div className="relative rounded-2xl border border-ink/10 bg-paper overflow-hidden transition-shadow hover:shadow-md hover:shadow-ink/5">
      <span className={`absolute left-0 inset-y-0 w-1.5 ${s.bar}`} />
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full text-left pl-6 pr-4 py-4 flex items-start gap-3">
        <s.Icon className={`w-5 h-5 mt-0.5 flex-none ${s.tint}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-[0.65rem] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full ${s.chip}`}>{f.fixFirst ? "Fix first" : s.label}</span>
            {f.impact && f.impact > 0 && f.severity !== "good" && (
              <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full bg-ink text-paper">About TZS {short(f.impact)}</span>
            )}
          </div>
          <div className="font-medium text-ink leading-snug">{f.title}</div>
        </div>
        <ChevronDown className={`w-4 h-4 mt-1 text-muted flex-none transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="pl-14 pr-5 pb-5 space-y-4 text-sm">
            <div><div className="text-[0.65rem] tracking-widest uppercase text-muted mb-1">What is happening</div><p className="text-ink-soft leading-relaxed">{f.what}</p></div>
            <div><div className="text-[0.65rem] tracking-widest uppercase text-muted mb-1">Why it matters</div><p className="text-ink-soft leading-relaxed">{f.why}</p></div>
            <div>
              <div className="text-[0.65rem] tracking-widest uppercase text-muted mb-1.5">What to do</div>
              <ol className="space-y-1.5">
                {f.actions.map((a, i) => (
                  <li key={i} className="flex gap-2.5 text-ink-soft">
                    <span className="flex-none w-5 h-5 rounded-full bg-gold/15 text-gold-deep text-[0.7rem] font-semibold grid place-items-center mt-0.5">{i + 1}</span>
                    <span className="leading-relaxed">{a}</span>
                  </li>
                ))}
              </ol>
            </div>
            {f.items && f.items.length > 0 && (
              <ul className="rounded-xl border border-ink/10 divide-y divide-ink/5">
                {f.items.map((it, i) => (
                  <li key={i}>
                    {it.href ? (
                      <Link href={it.href} className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-3 py-2.5 hover:bg-gold/10 transition-colors">
                        <span className="text-ink font-medium underline decoration-gold/40 underline-offset-4 group-hover:decoration-gold">{it.label}</span>
                        <span className="inline-flex items-center gap-1.5 text-ink-soft tabular-nums">{it.value}<ArrowUpRight className="w-4 h-4 text-gold opacity-60 group-hover:opacity-100" /></span>
                      </Link>
                    ) : (
                      <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 px-3 py-2">
                        <span className="text-ink font-medium">{it.label}</span><span className="text-ink-soft tabular-nums">{it.value}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {f.evidence.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {f.evidence.map(e => (
                  <span key={e.label} className="rounded-lg bg-paper-soft px-3 py-1.5 text-xs"><span className="text-muted">{e.label}: </span><b className="text-ink">{e.value}</b></span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
