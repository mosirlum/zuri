"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Phone, Clock, CheckCircle, AlertTriangle, Navigation, Pencil } from "lucide-react";

function EditDocsForm({ driver, onClose, onSave }: {
  driver: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const [licenseNumber, setLicenseNumber] = useState(driver?.license_number || "");
  const [licenseExpiry, setLicenseExpiry] = useState(driver?.license_expiry?.split("T")[0] || "");
  const [psvBadgeNumber, setPsvBadgeNumber] = useState(driver?.psv_badge_number || "");
  const [psvBadgeExpiry, setPsvBadgeExpiry] = useState(driver?.psv_badge_expiry?.split("T")[0] || "");
  const [goodConductExpiry, setGoodConductExpiry] = useState(driver?.good_conduct_expiry?.split("T")[0] || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/driver/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_number: licenseNumber || null,
          license_expiry: licenseExpiry || null,
          psv_badge_number: psvBadgeNumber || null,
          psv_badge_expiry: psvBadgeExpiry || null,
          good_conduct_expiry: goodConductExpiry || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setSaving(false);
        return;
      }
      onSave();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  };

  const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
  const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <h2 className="font-display text-xl font-medium">My Documents</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
          <div><label className={lbl}>License Number</label><input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} autoComplete="off" className={inp} /></div>
          <div><label className={lbl}>License Expiry</label><input type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>PSV Badge Number</label><input value={psvBadgeNumber} onChange={e => setPsvBadgeNumber(e.target.value)} autoComplete="off" className={inp} /></div>
          <div><label className={lbl}>PSV Badge Expiry</label><input type="date" value={psvBadgeExpiry} onChange={e => setPsvBadgeExpiry(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Good Conduct Expiry</label><input type="date" value={goodConductExpiry} onChange={e => setGoodConductExpiry(e.target.value)} className={inp} /></div>
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

export default function DriverPortal() {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (session?.user) fetchData();
  }, [session]);

  const fetchData = async () => {
    const res = await fetch("/api/driver/me");
    if (res.ok) {
      const data = await res.json();
      setDriver(data.driver);
      setAssignments(data.assignments);
    }
    setLoading(false);
  };

  const getDaysUntil = (date: string) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const docs = driver ? [
    { label: "Driving License", date: driver.license_expiry },
    { label: "PSV Badge", date: driver.psv_badge_expiry },
    { label: "Good Conduct", date: driver.good_conduct_expiry },
  ] : [];

  const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  };

  if (loading) return (
    <div className="text-center py-20 text-muted text-sm animate-pulse">Loading...</div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-ink text-paper rounded-2xl p-5">
        <div className="text-paper/60 text-xs tracking-widest uppercase mb-1">
          {new Date().toLocaleDateString("en-TZ", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 className="font-display text-2xl font-medium">
          Good {getTimeOfDay()}, <em className="italic text-gold">{session?.user?.name?.split(" ")[0]}.</em>
        </h1>
        {driver && (
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
              driver.status === "available" ? "bg-green-500/20 text-green-400" :
              driver.status === "on_duty" ? "bg-blue-500/20 text-blue-400" :
              "bg-paper/10 text-paper/60"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {driver.status?.replace("_", " ")}
            </span>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl font-medium text-ink mb-3">Your Assignments</h2>
        {assignments.length === 0 ? (
          <div className="bg-paper rounded-2xl border border-ink/10 p-8 text-center">
            <CheckCircle className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted text-sm">No active assignments.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((a, i) => (
              <div key={i} className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
                <div className="bg-ink/5 px-5 py-3 flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-gold">{a.booking_ref}</span>
                  <span className="text-xs capitalize text-muted">{a.service_type?.replace(/_/g, " ")}</span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted uppercase tracking-widest mb-0.5">Customer</div>
                      <div className="text-sm font-semibold text-ink">{a.customer_name || "—"}</div>
                    </div>
                    {a.customer_phone && (
                      <a href={`tel:${a.customer_phone}`}
                        className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-xl hover:bg-green-100">
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </div>

                  {a.pickup_datetime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gold flex-shrink-0" />
                      <span className="text-ink font-medium">
                        {new Date(a.pickup_datetime).toLocaleString("en-TZ", {
                          weekday: "short", day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    </div>
                  )}

                  {a.pickup_location && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs text-muted">{a.pickup_region}</div>
                          <div className="text-ink">{a.pickup_location}</div>
                        </div>
                      </div>
                      {a.dropoff_location && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-muted">{a.dropoff_region}</div>
                            <div className="text-ink">{a.dropoff_location}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {a.travel_details && (
                    <div className="bg-paper-soft rounded-xl p-3 text-xs text-ink-soft">{a.travel_details}</div>
                  )}

                  {a.pickup_location && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.pickup_location)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      <Navigation className="w-4 h-4" /> Google Maps
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-medium text-ink">My Documents</h2>
          <button onClick={() => setShowEdit(true)} title="Update"
            className="p-2 text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
          <div className="divide-y divide-ink/5">
            {docs.map(({ label, date }) => {
              const days = getDaysUntil(date);
              const isExpired = days !== null && days <= 0;
              const isCritical = days !== null && days > 0 && days <= 14;
              const isWarning = days !== null && days > 14 && days <= 30;
              return (
                <div key={label} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpired || isCritical ? (
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isExpired ? "text-red-500" : "text-amber-500"}`} />
                    ) : (
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${isWarning ? "text-yellow-500" : "text-green-500"}`} />
                    )}
                    <span className="text-sm font-medium text-ink">{label}</span>
                  </div>
                  <span className={`text-xs font-semibold ${
                    isExpired ? "text-red-600" : isCritical ? "text-red-500" : isWarning ? "text-amber-600" : days !== null ? "text-green-600" : "text-muted"
                  }`}>
                    {!date ? "Not set" : isExpired ? "EXPIRED" : days !== null ? `${days} days left` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showEdit && (
        <EditDocsForm
          driver={driver}
          onClose={() => setShowEdit(false)}
          onSave={() => { fetchData(); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
