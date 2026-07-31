"use client";

import { useEffect, useState, useCallback } from "react";
import { Car, User, CheckCircle } from "lucide-react";

interface DocAlert {
  entityType: "vehicle" | "driver";
  entityName: string;
  docType: string;
  expiryDate: string;
  daysLeft: number;
  action: string;
}

const statusStyle: Record<string, string> = {
  expired: "border-red-400 bg-red-50",
  critical: "border-red-300 bg-red-50/50",
  warning: "border-amber-300 bg-amber-50/30",
  ok: "border-green-200 bg-green-50/20",
};

const daysBadge: Record<string, string> = {
  expired: "bg-red-100 text-red-700",
  critical: "bg-red-100 text-red-600",
  warning: "bg-amber-100 text-amber-700",
  ok: "bg-green-100 text-green-700",
};

export default function CompliancePage() {
  const [alerts, setAlerts] = useState<DocAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const getDays = (date: string) =>
    Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const getStatus = (days: number) => {
    if (days <= 0) return "expired";
    if (days <= 14) return "critical";
    if (days <= 30) return "warning";
    return "ok";
  };

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

  const expired = alerts.filter(a => a.daysLeft <= 0).length;
  const critical = alerts.filter(a => a.daysLeft > 0 && a.daysLeft <= 14).length;
  const warning = alerts.filter(a => a.daysLeft > 14 && a.daysLeft <= 30).length;
  const ok = alerts.filter(a => a.daysLeft > 30).length;

  const filtered = filter === "all" ? alerts :
    filter === "expired" ? alerts.filter(a => a.daysLeft <= 0) :
    filter === "critical" ? alerts.filter(a => a.daysLeft > 0 && a.daysLeft <= 14) :
    filter === "warning" ? alerts.filter(a => a.daysLeft > 14 && a.daysLeft <= 30) :
    alerts.filter(a => a.daysLeft > 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">
          Compliance <em className="italic text-gold">Centre</em>
        </h1>
        
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Expired", count: expired, color: "bg-red-50 border-red-200 text-red-700", filter: "expired" },
          { label: "Critical (≤14d)", count: critical, color: "bg-red-50/60 border-red-200 text-red-600", filter: "critical" },
          { label: "Warning (≤30d)", count: warning, color: "bg-amber-50 border-amber-200 text-amber-700", filter: "warning" },
          { label: "All Good", count: ok, color: "bg-green-50 border-green-200 text-green-700", filter: "ok" },
        ].map(s => (
          <button key={s.filter} onClick={() => setFilter(filter === s.filter ? "all" : s.filter)}
            className={`rounded-2xl border p-5 text-left transition-all ${s.color} ${filter === s.filter ? "ring-2 ring-offset-1 ring-ink/20" : ""}`}>
            <div className="font-display text-3xl font-medium">{s.count}</div>
            <div className="text-xs mt-1 font-medium">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Document alerts */}
      <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">All Documents</h2>
          <div className="flex gap-2">
            {["all","expired","critical","warning","ok"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f ? "bg-ink text-paper" : "bg-paper-soft text-muted border border-ink/10 hover:border-ink/30"
                }`}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-muted text-sm animate-pulse">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-muted text-sm">No documents in this category.</p>
          </div>
        ) : (
          <div className="divide-y divide-ink/5">
            {filtered.map((alert, i) => {
              const status = getStatus(alert.daysLeft);
              return (
                <div key={i} className={`flex items-start gap-4 px-6 py-4 border-l-4 ${statusStyle[status]}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    alert.entityType === "vehicle" ? "bg-ink/5" : "bg-gold/10"
                  }`}>
                    {alert.entityType === "vehicle"
                      ? <Car className="w-4 h-4 text-ink/60" />
                      : <User className="w-4 h-4 text-gold" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink">{alert.entityName}</p>
                    <p className="text-xs text-muted">{alert.docType}</p>
                    {alert.daysLeft <= 30 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1.5 inline-block">
                        {alert.action}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${daysBadge[status]}`}>
                      {alert.daysLeft <= 0 ? "EXPIRED" : `${alert.daysLeft} days left`}
                    </span>
                    <p className="text-xs text-muted mt-1">
                      {new Date(alert.expiryDate).toLocaleDateString("en-TZ", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
