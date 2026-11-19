"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DashboardInsights from "@/components/DashboardInsights";
import {
  Car, Users, CalendarCheck, ShieldAlert, CheckCircle, Clock,
  Plus, TrendingUp, ArrowRight, DollarSign,
} from "lucide-react";

const money = (n: number) => Math.round(n).toLocaleString();

export default function AdminDashboard() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [stats, setStats] = useState<any>({
    totalVehicles: 0, availableVehicles: 0,
    totalDrivers: 0, availableDrivers: 0,
    confirmedBookings: 0, expiringDocuments: 0,
    vehiclesOnHire: 0, vehiclesBooked: 0, driversOnDuty: 0, driversBooked: 0,
  });
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any>({ total: 0, available: 0, on_hire: 0, booked: 0, maintenance: 0 });
  const [totals, setTotals] = useState<any>({ bookings: 0, completed: 0, cancelled: 0, outstanding: 0 });
  const [week, setWeek] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const data = await (await fetch("/api/admin/dashboard")).json();
      setStats(data.stats);
      setExpiringDocs(data.expiringDocs || []);
      setRecentBookings(data.recentBookings || []);
      if (data.fleet) setFleet(data.fleet);
      if (data.totals) setTotals(data.totals);
      if (data.week) setWeek(data.week);
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

  const fleetSplit = [
    { key: "available", label: "Available", count: fleet.available, color: "#16a34a" },
    { key: "on_hire", label: "On Hire", count: fleet.on_hire, color: "#2563eb" },
    { key: "booked", label: "Booked", count: fleet.booked, color: "#b8843a" },
    { key: "maintenance", label: "Maintenance", count: fleet.maintenance, color: "#d97706" },
  ];
  const fleetTotal = fleet.total || 1;

  // Stacked arcs on one circle — each slice starts where the last one ended.
  let arcOffset = 0;
  const arcs = fleetSplit.map(s => {
    const pct = (s.count / fleetTotal) * 100;
    const arc = { ...s, pct, offset: arcOffset };
    arcOffset += pct;
    return arc;
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dayCounts = days.map(d => week[dayKey(d)] || 0);

  const peak = Math.max(...dayCounts, 1);
  const W = 320, H = 90;
  const points = dayCounts.map((c, i) => {
    const x = (i / (dayCounts.length - 1)) * W;
    const y = H - (c / peak) * (H - 10);
    return { x, y, c };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

  const outstanding = totals.outstanding;
  const completedCount = totals.completed;
  const cancelledCount = totals.cancelled;

  const isBoss = role === "super_admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">
          Good {getTimeOfDay()}, <em className="italic text-gold">{session?.user?.name?.split(" ")[0] || "welcome back"}.</em>
        </h1>
        <p className="text-muted text-sm mt-1">
          {new Date().toLocaleDateString("en-TZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <DashboardInsights isBoss={isBoss} />

      <div className={`grid grid-cols-2 ${isBoss ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4`}>
        <StatCard icon={Car} label="Vehicles Free Today"
          value={`${stats.availableVehicles}/${stats.totalVehicles}`} color="gold"
          sub={[
            stats.vehiclesOnHire ? `${stats.vehiclesOnHire} on hire` : null,
            stats.vehiclesLeavingToday ? `${stats.vehiclesLeavingToday} leaving today` : null,
            stats.vehiclesBooked ? `${stats.vehiclesBooked} booked ahead` : null,
          ].filter(Boolean).join(" · ") || "none out"}
          href="/admin/fleet" />

        <StatCard icon={Users} label="Drivers Free Today"
          value={`${stats.availableDrivers}/${stats.totalDrivers}`} color="ink"
          sub={[
            stats.driversOnDuty ? `${stats.driversOnDuty} on a trip` : null,
            stats.driversLeavingToday ? `${stats.driversLeavingToday} leaving today` : null,
            stats.driversOnLeave ? `${stats.driversOnLeave} on leave` : null,
            stats.driversBooked ? `${stats.driversBooked} booked ahead` : null,
          ].filter(Boolean).join(" · ") || "none out"}
          href="/admin/drivers" />

        <StatCard icon={CalendarCheck} label="Confirmed Bookings"
          value={stats.confirmedBookings.toString()} color="gold" sub="awaiting completion"
          href="/admin/bookings" />

        <StatCard icon={ShieldAlert} label="Expiring Docs"
          value={stats.expiringDocuments.toString()}
          color={stats.expiringDocuments > 0 ? "red" : "green"} sub="within 30 days"
          href="/admin/compliance" />
        {isBoss && (
          <StatCard icon={DollarSign} label="Outstanding" value={money(outstanding)} color={outstanding > 0 ? "red" : "green"} sub="TZS awaiting payment" href="/admin/bookings" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-ink/10">
            <h2 className="font-display text-xl font-medium">Fleet Overview</h2>
          </div>
          <div className="p-6 flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <svg width="120" height="120" viewBox="0 0 42 42" className="-rotate-90">
                <circle cx="21" cy="21" r="15.9155" fill="none" stroke="currentColor" className="text-ink/5" strokeWidth="4" />
                {arcs.filter(a => a.count > 0).map(a => (
                  <circle key={a.key} cx="21" cy="21" r="15.9155" fill="none"
                    stroke={a.color} strokeWidth="4"
                    strokeDasharray={`${a.pct} ${100 - a.pct}`}
                    strokeDashoffset={-a.offset} />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-medium text-ink leading-none">{fleet.total}</span>
                <span className="text-[0.6rem] text-muted uppercase tracking-widest mt-0.5">Vehicles</span>
              </div>
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              {fleetSplit.map(s => (
                <div key={s.key} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-ink-soft flex-1">{s.label}</span>
                  <span className="text-ink font-medium">{s.count}</span>
                  <span className="text-muted text-xs w-10 text-right">
                    {Math.round((s.count / fleetTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium">Bookings Overview</h2>
            <span className="text-xs text-muted">Last 7 days</span>
          </div>
          <div className="px-6 pt-5">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "110px" }} preserveAspectRatio="none">
              <path d={areaPath} fill="currentColor" className="text-gold/10" />
              <path d={linePath} fill="none" stroke="currentColor" className="text-gold" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill="currentColor" className="text-gold" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
            <div className="flex justify-between mt-2">
              {days.map((d, i) => (
                <span key={i} className="text-[0.65rem] text-muted">
                  {d.toLocaleDateString("en-TZ", { day: "numeric", month: "short" })}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-ink/5 border-t border-ink/10 mt-4">
            <div className="px-6 py-4">
              <div className="font-display text-2xl font-medium text-ink">{totals.bookings}</div>
              <div className="text-xs text-muted mt-0.5">Total bookings</div>
            </div>
            <div className="px-6 py-4">
              <div className="font-display text-2xl font-medium text-green-600">{completedCount}</div>
              <div className="text-xs text-muted mt-0.5">Completed</div>
            </div>
            <div className="px-6 py-4">
              <div className="font-display text-2xl font-medium text-red-500">{cancelledCount}</div>
              <div className="text-xs text-muted mt-0.5">Cancelled</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <Link href="/admin/compliance" className="text-xs text-gold hover:underline">View all {expiringDocs.length} alerts →</Link>
            </div>
          )}
        </div>

        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-xs text-gold hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-ink/5">
            {recentBookings.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Clock className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">No bookings yet.</p>
                <Link href="/admin/bookings" className="text-gold text-sm hover:underline mt-1 inline-block">Create first booking →</Link>
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

      <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/10">
          <h2 className="font-display text-xl font-medium">Quick Actions</h2>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href="/admin/bookings" icon={Plus} label="New Booking" />
          <QuickAction href="/admin/fleet" icon={Car} label="Fleet" />
          <QuickAction href="/admin/compliance" icon={ShieldAlert} label="Compliance" />
          {isBoss
            ? <QuickAction href="/admin/reports" icon={TrendingUp} label="Reports" />
            : <QuickAction href="/admin/drivers" icon={Users} label="Drivers" />}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href}
      className="group flex flex-col items-start gap-3 rounded-xl border border-ink/10 bg-paper-soft p-4 transition-all hover:border-gold/40 hover:bg-gold/5">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gold/10 text-gold">
        <Icon className="w-4 h-4" />
      </span>
      <span className="text-sm font-medium text-ink flex items-center gap-1">
        {label}
        <ArrowRight className="w-3 h-3 text-muted transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, color, sub, href }: {
  icon: any; label: string; value: string; color: string; sub: string; href?: string;
}) {
  const colors: Record<string, string> = {
    gold: "bg-gold/10 text-gold border-gold/20",
    ink: "bg-ink/5 text-ink border-ink/10",
    red: "bg-red-50 text-red-600 border-red-200",
    green: "bg-green-50 text-green-600 border-green-200",
  };
  const inner = (
    <>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-display text-3xl font-medium text-ink leading-none mb-1">{value}</div>
      <div className="text-sm font-medium text-ink mb-0.5">{label}</div>
      <div className="text-xs text-muted">{sub}</div>
    </>
  );

  // Every figure here answers a question the person will want to follow up on,
  // so the card takes them to the list behind it.
  if (href) {
    return (
      <Link href={href}
        className="bg-paper rounded-2xl border border-ink/10 p-5 block transition-all hover:border-gold/40 hover:bg-gold/5">
        {inner}
      </Link>
    );
  }

  return <div className="bg-paper rounded-2xl border border-ink/10 p-5">{inner}</div>;
}
