"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Car, User, CheckCircle, FileWarning, Clock, AlertTriangle,
  ShieldCheck, Calendar, ArrowRight, ChevronDown,
} from "lucide-react";

interface DocAlert {
  entityType: "vehicle" | "driver";
  entityName: string;
  docType: string;
  expiryDate: string;
  daysLeft: number;
  action: string;
}

type Level = "expired" | "critical" | "warning" | "ok";

const getStatus = (days: number): Level => {
  if (days <= 0) return "expired";
  if (days <= 14) return "critical";
  if (days <= 30) return "warning";
  return "ok";
};

const badge: Record<Level, string> = {
  expired: "bg-red-100 text-red-700",
  critical: "bg-orange-100 text-orange-700",
  warning: "bg-amber-100 text-amber-700",
  ok: "bg-green-100 text-green-700",
};

const stripe: Record<Level, string> = {
  expired: "border-l-red-500 bg-red-50/60",
  critical: "border-l-orange-400 bg-orange-50/50",
  warning: "border-l-amber-400 bg-amber-50/40",
  ok: "border-l-green-400 bg-green-50/30",
};

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString("en-TZ", { day: "numeric", month: "short", year: "numeric" });

export default function CompliancePage() {
  const [alerts, setAlerts] = useState<DocAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Level>("all");
  const [showAllCompliant, setShowAllCompliant] = useState(false);

  const getDays = (date: string) =>
    Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const fetchData = useCallback(async () => {
    const [vRes, dRes] = await Promise.all([
      fetch("/api/admin/vehicles"),
      fetch("/api/admin/drivers"),
    ]);
    const vehicles = await vRes.json();
    const drivers = await dRes.json();

    const all: DocAlert[] = [];

    vehicles.forEach((v: any) => {
      const name = `${v.make} ${v.model}${v.plate_number ? ` (${v.plate_number})` : ""}`;
      [
        { label: "Insurance", date: v.insurance_expiry, action: "Renew insurance" },
        { label: "Operating Licence", date: v.operating_licence_expiry, action: "Renew at LATRA" },
        { label: "Registration", date: v.registration_expiry, action: "Renew at TRA" },
        { label: "Road Worthiness", date: v.road_worthiness_expiry, action: "Book inspection" },
        { label: "TRA Sticker", date: v.tra_sticker_expiry, action: "Renew at TRA" },
      ].forEach(({ label, date, action }) => {
        if (date) all.push({ entityType: "vehicle", entityName: name, docType: label, expiryDate: date, daysLeft: getDays(date), action });
      });
    });

    drivers.forEach((d: any) => {
      [
        { label: "Driving License", date: d.license_expiry, action: "Renew licence" },
        { label: "PSV Badge", date: d.psv_badge_expiry, action: "Renew PSV badge" },
        { label: "Good Conduct", date: d.good_conduct_expiry, action: "Get new certificate" },
      ].forEach(({ label, date, action }) => {
        if (date) all.push({ entityType: "driver", entityName: d.full_name, docType: label, expiryDate: date, daysLeft: getDays(date), action });
      });
    });

    all.sort((a, b) => a.daysLeft - b.daysLeft);
    setAlerts(all);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const expired = alerts.filter(a => a.daysLeft <= 0);
  const critical = alerts.filter(a => a.daysLeft > 0 && a.daysLeft <= 14);
  const warning = alerts.filter(a => a.daysLeft > 14 && a.daysLeft <= 30);
  const compliant = alerts.filter(a => a.daysLeft > 30);

  // Anything inside 30 days needs a decision now — that's the working list.
  const needsAttention = alerts.filter(a => a.daysLeft <= 30);
  const attentionFiltered = filter === "all" ? needsAttention : needsAttention.filter(a => getStatus(a.daysLeft) === filter);

  const upcoming = compliant.slice(0, 5);
  const compliantShown = showAllCompliant ? compliant : compliant.slice(0, 5);

  const summary: Array<{ key: Level; label: string; sub: string; count: number; icon: any; tone: string }> = [
    { key: "expired", label: "Expired", sub: "Require immediate action", count: expired.length, icon: FileWarning, tone: "bg-red-50 border-red-200 text-red-600" },
    { key: "critical", label: "Critical", sub: "14 days or less", count: critical.length, icon: Clock, tone: "bg-orange-50 border-orange-200 text-orange-600" },
    { key: "warning", label: "Warning", sub: "30 days or less", count: warning.length, icon: AlertTriangle, tone: "bg-amber-50 border-amber-200 text-amber-600" },
    { key: "ok", label: "All Good", sub: "Documents compliant", count: compliant.length, icon: ShieldCheck, tone: "bg-green-50 border-green-200 text-green-600" },
  ];

  const targetHref = (a: DocAlert) => a.entityType === "vehicle" ? "/admin/fleet" : "/admin/drivers";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">
          Compliance <em className="italic text-gold">Centre</em>
        </h1>
        <p className="text-muted text-sm mt-1">{alerts.length} documents tracked</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map(s => {
          const Icon = s.icon;
          const active = filter === s.key;
          return (
            <button key={s.key} onClick={() => setFilter(active ? "all" : s.key)}
              className={`bg-paper rounded-2xl border p-5 text-left transition-all ${
                active ? "border-gold ring-1 ring-gold/30" : "border-ink/10 hover:border-ink/25"
              }`}>
              <div className="flex items-start justify-between">
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${s.tone}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-muted" />
              </div>
              <div className="font-display text-3xl font-medium text-ink leading-none mt-4">{s.count}</div>
              <div className="text-sm font-medium text-ink mt-1">{s.label}</div>
              <div className="text-xs text-muted mt-0.5">{s.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs attention */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-medium">Requiring Attention</h2>
                {needsAttention.length > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                    {needsAttention.length}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "expired", "critical", "warning"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filter === f ? "bg-ink text-paper" : "bg-paper-soft text-muted border border-ink/10 hover:border-ink/30"
                    }`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center text-muted text-sm animate-pulse">Loading...</div>
            ) : attentionFiltered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-muted text-sm">Nothing needs attention.</p>
              </div>
            ) : (
              <div className="divide-y divide-ink/5">
                {attentionFiltered.map((a, i) => {
                  const status = getStatus(a.daysLeft);
                  return (
                    <div key={i} className={`flex items-center gap-4 px-6 py-4 border-l-4 ${stripe[status]}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        a.entityType === "vehicle" ? "bg-ink/5" : "bg-gold/10"
                      }`}>
                        {a.entityType === "vehicle"
                          ? <Car className="w-4 h-4 text-ink/60" />
                          : <User className="w-4 h-4 text-gold" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{a.entityName}</p>
                        <p className="text-xs text-muted">{a.docType}</p>
                        <p className={`text-xs mt-1 font-medium ${
                          status === "expired" ? "text-red-600" : status === "critical" ? "text-orange-600" : "text-amber-700"
                        }`}>
                          {a.daysLeft <= 0
                            ? `Expired ${Math.abs(a.daysLeft)} days ago`
                            : `${a.daysLeft} days left`}
                          <span className="text-muted font-normal"> · {shortDate(a.expiryDate)}</span>
                        </p>
                      </div>

                      <Link href={targetHref(a)}
                        className="flex items-center gap-1.5 text-xs font-medium border border-ink/15 rounded-xl px-3 py-2 text-ink-soft hover:border-gold hover:text-gold transition-colors flex-shrink-0">
                        {a.action}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compliant */}
          <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
              <h2 className="font-display text-xl font-medium">Compliant Documents</h2>
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                {compliant.length}
              </span>
            </div>

            {compliant.length === 0 ? (
              <div className="px-6 py-10 text-center text-muted text-sm">Nothing here yet.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-ink/10 bg-paper-soft">
                        {["Vehicle / Driver", "Document", "Expiry", "Status"].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs tracking-widest uppercase text-muted font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {compliantShown.map((a, i) => (
                        <tr key={i} className="hover:bg-paper-soft transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              <span className="text-sm text-ink">{a.entityName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-ink-soft whitespace-nowrap">{a.docType}</td>
                          <td className="px-6 py-3 text-sm text-muted whitespace-nowrap">{shortDate(a.expiryDate)}</td>
                          <td className="px-6 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.ok}`}>
                              {a.daysLeft} days left
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {compliant.length > 5 && (
                  <div className="px-6 py-3 border-t border-ink/5 text-center">
                    <button onClick={() => setShowAllCompliant(v => !v)}
                      className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline">
                      {showAllCompliant ? "Show less" : `Show all ${compliant.length}`}
                      <ChevronDown className={`w-3 h-3 transition-transform ${showAllCompliant ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold" />
            <h2 className="font-display text-xl font-medium">Upcoming</h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted text-sm">Nothing scheduled.</div>
          ) : (
            <div className="divide-y divide-ink/5">
              {upcoming.map((a, i) => {
                const d = new Date(a.expiryDate);
                return (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="text-center flex-shrink-0 w-10">
                      <div className="font-display text-lg font-medium text-ink leading-none">
                        {String(d.getDate()).padStart(2, "0")}
                      </div>
                      <div className="text-[0.6rem] tracking-widest uppercase text-muted mt-0.5">
                        {d.toLocaleDateString("en-TZ", { month: "short" })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{a.entityName}</p>
                      <p className="text-xs text-muted">{a.docType}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${badge.ok}`}>
                      {a.daysLeft}d
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
