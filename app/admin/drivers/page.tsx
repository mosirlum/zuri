"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { Plus, User, AlertTriangle, CheckCircle, Edit, Phone, Trash2, Info } from "lucide-react";

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
  booked: "bg-amber-100 text-amber-700",
  leave: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  available: "Available",
  on_duty: "On Duty",
  booked: "Booked",
  leave: "On Leave",
};

const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
const sel = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold";
const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";

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

const DriverCard = memo(({ driver, getDaysUntil, onEdit, onDelete }: {
  driver: Driver;
  getDaysUntil: (date: string) => number | null;
  onEdit: (d: Driver) => void;
  onDelete: (d: Driver) => void;
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
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(driver)} title="Edit"
            className="text-paper/40 hover:text-gold transition-colors p-1.5 rounded-lg hover:bg-paper/5">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(driver)} title="Delete"
            className="text-paper/40 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${statusColors[driver.status] || "bg-gray-100 text-gray-600"}`}>
              {statusLabels[driver.status] || driver.status}
            </span>
            {(driver as any).next_booking && driver.status === "booked" && (
              <div className="text-[0.65rem] text-muted mt-1">
                {new Date((driver as any).next_booking).toLocaleDateString("en-TZ", { day: "numeric", month: "short" })}
                {(driver as any).next_booking_ref ? ` · ${(driver as any).next_booking_ref}` : ""}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${driver.uniform_compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {driver.uniform_compliant ? "✓ Uniform" : "✗ Uniform"}
            </span>
            <span className="text-xs text-muted">Class <strong className="text-ink">{driver.license_class || "—"}</strong></span>
          </div>
        </div>

        <div className="border-t border-ink/5 pt-3 space-y-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted uppercase tracking-widest">Documents</span>
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

function DeleteDriverModal({ driver, onClose, onDeleted }: {
  driver: Driver; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: driver.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "has_history") setBlocked(data.message);
        else setError(data.error || "Something went wrong");
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Network error");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">{blocked ? "Can't Delete" : "Delete Driver"}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <div className="bg-paper-soft border border-ink/10 rounded-xl px-4 py-3">
            <div className="text-sm font-semibold text-ink">{driver.full_name}</div>
            <div className="text-xs text-muted mt-0.5">{driver.phone || "No phone"}</div>
          </div>
          {blocked ? (
            <>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">{blocked}</div>
              <p className="text-xs text-muted">Set them <strong className="text-ink">On Leave</strong> instead — the trip records stay intact.</p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">This cannot be undone.</p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">
            {blocked ? "Close" : "Cancel"}
          </button>
          {!blocked && (
            <button onClick={handleDelete} disabled={deleting}
              className="px-5 py-2.5 text-sm bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DriverForm({ driver, onClose, onSave }: {
  driver: Driver | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const editing = !!driver;
  const [fullName, setFullName] = useState(driver?.full_name || "");
  const [phone, setPhone] = useState(driver?.phone || "");
  const [email, setEmail] = useState(driver?.email || "");
  const [onLeave, setOnLeave] = useState(driver?.status === "leave");
  const [licenseNumber, setLicenseNumber] = useState(driver?.license_number || "");
  const [licenseClass, setLicenseClass] = useState(driver?.license_class || "C");
  const [licenseExpiry, setLicenseExpiry] = useState(driver?.license_expiry?.split("T")[0] || "");
  const [psvBadgeNumber, setPsvBadgeNumber] = useState(driver?.psv_badge_number || "");
  const [psvBadgeExpiry, setPsvBadgeExpiry] = useState(driver?.psv_badge_expiry?.split("T")[0] || "");
  const [goodConductExpiry, setGoodConductExpiry] = useState(driver?.good_conduct_expiry?.split("T")[0] || "");
  const [emergencyName, setEmergencyName] = useState(driver?.emergency_contact_name || "");
  const [emergencyPhone, setEmergencyPhone] = useState(driver?.emergency_contact_phone || "");
  const [uniformCompliant, setUniformCompliant] = useState(driver?.uniform_compliant || false);
  const [uniformLastChecked, setUniformLastChecked] = useState(driver?.uniform_last_checked?.split("T")[0] || "");
  const [uniformNotes, setUniformNotes] = useState(driver?.uniform_notes || "");
  const [notes, setNotes] = useState(driver?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/drivers", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: driver?.id,
        full_name: fullName, phone: phone || null, email: email || null,
        status: onLeave ? "leave" : "available",
        license_number: licenseNumber || null,
        license_class: licenseClass || null,
        license_expiry: licenseExpiry || null,
        psv_badge_number: psvBadgeNumber || null,
        psv_badge_expiry: psvBadgeExpiry || null,
        good_conduct_expiry: goodConductExpiry || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        uniform_compliant: uniformCompliant,
        uniform_last_checked: uniformLastChecked || null,
        uniform_notes: uniformNotes || null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <h2 className="font-display text-xl font-medium">{editing ? driver!.full_name : "Add Driver"}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Full Name *</label><input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="off" className={inp} /></div>
              <div><label className={lbl}>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} autoComplete="off" className={inp} /></div>
              <div className="sm:col-span-2"><label className={lbl}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" className={inp} /></div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-paper-soft border border-ink/10 rounded-xl px-4 py-3">
            <input type="checkbox" id="leave" checked={onLeave} onChange={e => setOnLeave(e.target.checked)} className="w-4 h-4 accent-gold" />
            <label htmlFor="leave" className="text-sm font-medium text-ink cursor-pointer flex-1">On leave</label>
            <span className="text-xs text-muted">Not available for bookings</span>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Documents</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>License Number</label><input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} autoComplete="off" className={inp} /></div>
              <div><label className={lbl}>License Class</label>
                <select value={licenseClass} onChange={e => setLicenseClass(e.target.value)} className={sel}>
                  {["B","C","E","B+C","C+E"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div><label className={lbl}>License Expiry</label><input type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>PSV Badge Number</label><input value={psvBadgeNumber} onChange={e => setPsvBadgeNumber(e.target.value)} autoComplete="off" className={inp} /></div>
              <div><label className={lbl}>PSV Badge Expiry</label><input type="date" value={psvBadgeExpiry} onChange={e => setPsvBadgeExpiry(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Good Conduct Expiry</label><input type="date" value={goodConductExpiry} onChange={e => setGoodConductExpiry(e.target.value)} className={inp} /></div>
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

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end sticky bottom-0 bg-paper">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={saving || !fullName}
            className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
            {saving ? "Saving..." : editing ? "Save" : "Add Driver"}
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
  const [deleteDriver, setDeleteDriver] = useState<Driver | null>(null);
  const [filter, setFilter] = useState("all");

  const getDaysUntil = useCallback((date: string) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, []);

  const fetchDrivers = useCallback(async () => {
    const res = await fetch("/api/admin/drivers");
    const data = await res.json();
    setDrivers(Array.isArray(data) ? data : []);
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
          <p className="text-muted text-sm mt-1">
            {drivers.length} drivers · {drivers.filter(d => d.status === "available").length} available · {drivers.filter(d => d.status === "on_duty").length} on duty · {drivers.filter(d => d.status === "booked").length} booked
          </p>
        </div>
        <button onClick={() => { setEditDriver(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors rounded-xl">
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {["all", "available", "on_duty", "booked", "leave"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f ? "bg-ink text-paper" : "bg-paper text-muted border border-ink/10 hover:border-ink/30"
              }`}>
              {f === "all" ? "All Drivers" : statusLabels[f]}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Info className="w-3.5 h-3.5" />
          On Duty and Booked come from the trips
        </span>
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
            <DriverCard key={driver.id} driver={driver} getDaysUntil={getDaysUntil}
              onEdit={handleEdit} onDelete={setDeleteDriver} />
          ))}
        </div>
      )}

      {showForm && (
        <DriverForm driver={editDriver} onClose={() => setShowForm(false)}
          onSave={() => { fetchDrivers(); setShowForm(false); }} />
      )}

      {deleteDriver && (
        <DeleteDriverModal driver={deleteDriver} onClose={() => setDeleteDriver(null)}
          onDeleted={() => { fetchDrivers(); setDeleteDriver(null); }} />
      )}
    </div>
  );
}
