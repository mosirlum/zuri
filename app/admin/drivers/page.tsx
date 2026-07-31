"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { Plus, User, AlertTriangle, CheckCircle, Edit, Phone, Lock } from "lucide-react";
import Link from "next/link";

interface Driver {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  status: string;
  license_number: string;
  license_class: string;
  license_expiry: string;
  psv_badge_number: string;
  psv_badge_expiry: string;
  good_conduct_expiry: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  uniform_compliant: boolean;
  uniform_last_checked: string;
  uniform_notes: string;
  notes: string;
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  on_duty: "bg-blue-100 text-blue-700",
  off: "bg-gray-100 text-gray-600",
  leave: "bg-amber-100 text-amber-700",
};

function DocRow({ label, days, date }: { label: string; days: number | null; date: string }) {
  const color = !date ? "text-muted" : days === null ? "text-muted" : days <= 0 ? "text-red-600 font-semibold" : days <= 14 ? "text-red-500" : days <= 30 ? "text-amber-600" : "text-green-600";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className={color}>
        {!date ? "Not set" : days !== null && days <= 0 ? "EXPIRED" : days !== null ? `${days}d · ${new Date(date).toLocaleDateString("en-TZ")}` : "—"}
      </span>
    </div>
  );
}

const DriverCard = memo(({ driver, getDaysUntil, onEdit }: {
  driver: Driver;
  getDaysUntil: (date: string) => number | null;
  onEdit: (d: Driver) => void;
}) => {
  const dates = [driver.license_expiry, driver.psv_badge_expiry, driver.good_conduct_expiry].filter(Boolean);
  const docStatus = dates.length === 0 ? "unknown" : (() => {
    const minDays = Math.min(...dates.map(d => getDaysUntil(d) ?? 999));
    if (minDays <= 0) return "expired";
    if (minDays <= 14) return "critical";
    if (minDays <= 30) return "warning";
    return "ok";
  })();

  return (
    <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden hover:border-gold/40 transition-all">
      <div className="bg-ink px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-ink font-bold text-lg">
            {driver.full_name.charAt(0)}
          </div>
          <div>
            <div className="font-display text-lg text-paper font-medium leading-none">{driver.full_name}</div>
            <div className="text-paper/60 text-xs mt-0.5 flex items-center gap-1">
              <Phone className="w-3 h-3" />{driver.phone || "No phone"}
            </div>
          </div>
        </div>
        <button onClick={() => onEdit(driver)} title="Edit"
          className="text-paper/40 hover:text-gold transition-colors p-1">
          <Edit className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${statusColors[driver.status] || "bg-gray-100 text-gray-600"}`}>
            {driver.status?.replace("_", " ")}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${driver.uniform_compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {driver.uniform_compliant ? "✓ Uniform" : "✗ Uniform"}
            </span>
            <span className="text-xs text-muted">Class <strong className="text-ink">{driver.license_class || "—"}</strong></span>
          </div>
        </div>

        <div className="border-t border-ink/5 pt-3 space-y-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted uppercase tracking-widest flex items-center gap-1.5">
              Documents
              <Lock className="w-3 h-3 opacity-50" />
            </span>
            {docStatus === "ok" && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            {["warning", "critical", "expired"].includes(docStatus) && (
              <AlertTriangle className={`w-3.5 h-3.5 ${docStatus === "expired" ? "text-red-500" : docStatus === "critical" ? "text-red-400" : "text-amber-500"}`} />
            )}
          </div>
          <DocRow label="Driving License" days={getDaysUntil(driver.license_expiry)} date={driver.license_expiry} />
          <DocRow label="PSV Badge" days={getDaysUntil(driver.psv_badge_expiry)} date={driver.psv_badge_expiry} />
          <DocRow label="Good Conduct" days={getDaysUntil(driver.good_conduct_expiry)} date={driver.good_conduct_expiry} />
        </div>
      </div>
    </div>
  );
});
DriverCard.displayName = "DriverCard";

// Documents are owned by the driver — Ray sees them, the driver keeps them current.
function DriverForm({ driver, onClose, onSave }: {
  driver: Driver;
  onClose: () => void;
  onSave: () => void;
}) {
  const [status, setStatus] = useState(driver.status || "available");
  const [emergencyName, setEmergencyName] = useState(driver.emergency_contact_name || "");
  const [emergencyPhone, setEmergencyPhone] = useState(driver.emergency_contact_phone || "");
  const [uniformCompliant, setUniformCompliant] = useState(driver.uniform_compliant || false);
  const [uniformLastChecked, setUniformLastChecked] = useState(driver.uniform_last_checked?.split("T")[0] || "");
  const [uniformNotes, setUniformNotes] = useState(driver.uniform_notes || "");
  const [notes, setNotes] = useState(driver.notes || "");
  const [saving, setSaving] = useState(false);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-TZ") : "—";

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/drivers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: driver.id,
        full_name: driver.full_name, phone: driver.phone || null, email: driver.email || null,
        license_number: driver.license_number || null, license_class: driver.license_class || null,
        license_expiry: driver.license_expiry || null,
        psv_badge_number: driver.psv_badge_number || null, psv_badge_expiry: driver.psv_badge_expiry || null,
        good_conduct_expiry: driver.good_conduct_expiry || null,
        status,
        emergency_contact_name: emergencyName || null, emergency_contact_phone: emergencyPhone || null,
        uniform_compliant: uniformCompliant,
        uniform_last_checked: uniformLastChecked || null,
        uniform_notes: uniformNotes || null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    onSave();
  };

  const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
  const sel = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold";
  const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <div>
            <h2 className="font-display text-xl font-medium">{driver.full_name}</h2>
            <p className="text-xs text-muted mt-0.5">{driver.phone || "No phone"}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className={lbl}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={sel}>
              {["available","on_duty","off","leave"].map(o => <option key={o} value={o}>{o.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3 flex items-center gap-1.5">
              Documents <Lock className="w-3 h-3 opacity-50" />
            </p>
            <div className="bg-paper-soft border border-ink/10 rounded-xl divide-y divide-ink/5">
              <div className="px-4 py-2.5 flex justify-between text-sm">
                <span className="text-muted">License</span>
                <span className="text-ink">{driver.license_number || "—"}{driver.license_class ? ` · ${driver.license_class}` : ""}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between text-sm">
                <span className="text-muted">License expiry</span>
                <span className="text-ink">{fmt(driver.license_expiry)}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between text-sm">
                <span className="text-muted">PSV badge</span>
                <span className="text-ink">{driver.psv_badge_number || "—"}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between text-sm">
                <span className="text-muted">PSV expiry</span>
                <span className="text-ink">{fmt(driver.psv_badge_expiry)}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between text-sm">
                <span className="text-muted">Good conduct expiry</span>
                <span className="text-ink">{fmt(driver.good_conduct_expiry)}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Emergency Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Name</label><input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} autoComplete="off" className={inp} /></div>
              <div><label className={lbl}>Phone</label><input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} autoComplete="off" className={inp} /></div>
            </div>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Uniform</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-paper-soft border border-ink/10 rounded-xl px-4 py-3">
                <input type="checkbox" id="uniform" checked={uniformCompliant} onChange={e => setUniformCompliant(e.target.checked)} className="w-4 h-4 accent-gold" />
                <label htmlFor="uniform" className="text-sm font-medium text-ink cursor-pointer">Compliant</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={lbl}>Last Checked</label><input type="date" value={uniformLastChecked} onChange={e => setUniformLastChecked(e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Notes</label><input value={uniformNotes} onChange={e => setUniformNotes(e.target.value)} autoComplete="off" className={inp} /></div>
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [filter, setFilter] = useState("all");

  const getDaysUntil = useCallback((date: string) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, []);

  const fetchDrivers = useCallback(async () => {
    const res = await fetch("/api/admin/drivers");
    const data = await res.json();
    setDrivers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleEdit = useCallback((d: Driver) => {
    setEditDriver(d);
    setShowForm(true);
  }, []);

  const filtered = filter === "all" ? drivers : drivers.filter(d => d.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink">
            Driver <em className="italic text-gold">Management</em>
          </h1>
          <p className="text-muted text-sm mt-1">{drivers.length} drivers · {drivers.filter(d => d.status === "available").length} available</p>
        </div>
        <Link href="/admin/users"
          className="flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors rounded-xl">
          <Plus className="w-4 h-4" /> Add Driver
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "available", "on_duty", "off", "leave"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f ? "bg-ink text-paper" : "bg-paper text-muted border border-ink/10 hover:border-ink/30"
            }`}>
            {f === "all" ? "All Drivers" : f.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm animate-pulse">Loading drivers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-paper rounded-2xl border border-ink/10">
          <User className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">No drivers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(driver => (
            <DriverCard key={driver.id} driver={driver} getDaysUntil={getDaysUntil} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {showForm && editDriver && (
        <DriverForm driver={editDriver} onClose={() => setShowForm(false)} onSave={() => { fetchDrivers(); setShowForm(false); }} />
      )}
    </div>
  );
}
