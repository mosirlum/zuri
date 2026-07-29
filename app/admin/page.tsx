"use client";

import { useEffect, useState } from "react";
import { Car, Users, CalendarCheck, ShieldAlert, CheckCircle, Clock } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({
    totalVehicles: 0, availableVehicles: 0,
    totalDrivers: 0, availableDrivers: 0,
    confirmedBookings: 0, expiringDocuments: 0,
  });
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      setStats(data.stats);
      setExpiringDocs(data.expiringDocs);
      setRecentBookings(data.recentBookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted text-sm animate-pulse">Loading dashboard...</div>
    </div>
  );

  const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">
          Good {getTimeOfDay()}, <em className="italic text-gold">welcome back.</em>
        </h1>
        <p className="text-muted text-sm mt-1">
          {new Date().toLocaleDateString("en-TZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards — removed Today's Bookings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Vehicles Available" value={`${stats.availableVehicles}/${stats.totalVehicles}`} color="gold" sub="of total fleet" />
        <StatCard icon={Users} label="Drivers Available" value={`${stats.availableDrivers}/${stats.totalDrivers}`} color="ink" sub="ready to dispatch" />
        <StatCard icon={CalendarCheck} label="Confirmed Bookings" value={stats.confirmedBookings.toString()} color="gold" sub="awaiting completion" />
        <StatCard icon={ShieldAlert} label="Expiring Docs" value={stats.expiringDocuments.toString()} color={stats.expiringDocuments > 0 ? "red" : "green"} sub="within 30 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Alerts */}
        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium">Document Alerts</h2>
            {stats.expiringDocuments > 0 && (
              <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
                {stats.expiringDocuments} expiring
              </span>
            )}
          </div>
          <div className="divide-y divide-ink/5">
            {expiringDocs.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted">All documents are valid.</p>
              </div>
            ) : expiringDocs.slice(0, 6).map((doc, i) => (
              <div key={i} className="px-6 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  doc.daysLeft <= 0 ? "bg-red-600" : doc.daysLeft <= 7 ? "bg-red-500" : doc.daysLeft <= 14 ? "bg-amber-500" : "bg-yellow-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{doc.name}</p>
                  <p className="text-xs text-muted">{doc.document}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${
                    doc.daysLeft <= 0 ? "text-red-600" : doc.daysLeft <= 7 ? "text-red-500" : doc.daysLeft <= 14 ? "text-amber-500" : "text-yellow-600"
                  }`}>
                    {doc.daysLeft <= 0 ? "EXPIRED" : `${doc.daysLeft}d left`}
                  </p>
                  <p className="text-xs text-muted">{new Date(doc.expiry).toLocaleDateString("en-TZ")}</p>
                </div>
              </div>
            ))}
          </div>
          {expiringDocs.length > 6 && (
            <div className="px-6 py-3 border-t border-ink/5">
              <a href="/admin/compliance" className="text-xs text-gold hover:underline">View all {expiringDocs.length} alerts →</a>
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium">Recent Bookings</h2>
            <a href="/admin/bookings" className="text-xs text-gold hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-ink/5">
            {recentBookings.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Clock className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">No bookings yet.</p>
                <a href="/admin/bookings" className="text-gold text-sm hover:underline mt-1 inline-block">Create first booking →</a>
              </div>
            ) : recentBookings.map((b, i) => (
              <div key={i} className="px-6 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink font-mono">{b.booking_ref}</p>
                  <p className="text-xs text-muted capitalize">{b.service_type?.replace(/_/g, " ")}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                  b.status === "completed" ? "bg-green-100 text-green-700" :
                  b.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-600"
                }`}>{b.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string; color: string; sub: string;
}) {
  const colors: Record<string, string> = {
    gold: "bg-gold/10 text-gold border-gold/20",
    ink: "bg-ink/5 text-ink border-ink/10",
    red: "bg-red-50 text-red-600 border-red-200",
    green: "bg-green-50 text-green-600 border-green-200",
  };
  return (
    <div className="bg-paper rounded-2xl border border-ink/10 p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-display text-3xl font-medium text-ink leading-none mb-1">{value}</div>
      <div className="text-sm font-medium text-ink mb-0.5">{label}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}
