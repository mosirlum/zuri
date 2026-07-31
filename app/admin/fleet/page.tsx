"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { Plus, Car, AlertTriangle, CheckCircle, Edit, Trash2 } from "lucide-react";

interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  plate_number: string;
  category: string;
  seats: number;
  status: string;
  color: string;
  insurance_expiry: string;
  operating_licence_expiry: string;
  road_worthiness_expiry: string;
  registration_expiry: string;
  tra_sticker_expiry: string;
  last_service_date: string;
  next_service_date: string;
  service_notes: string;
  notes: string;
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  on_hire: "bg-blue-100 text-blue-700",
  maintenance: "bg-amber-100 text-amber-700",
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

function ServiceRow({ last, next, notes }: { last: string; next: string | null; notes: string | null }) {
  const getDays = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const nextDays = next ? getDays(next) : null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Last Service</span>
        {last ? (
          <span className="text-ink/60">{new Date(last).toLocaleDateString("en-TZ")}</span>
        ) : (
          <span className="text-muted">Not recorded</span>
        )}
      </div>
      {next && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Next Due</span>
          <span className={`font-medium ${nextDays !== null && nextDays <= 0 ? "text-red-500" : nextDays !== null && nextDays <= 14 ? "text-amber-500" : "text-green-600"}`}>
            {nextDays !== null && nextDays <= 0 ? "OVERDUE" : `${new Date(next).toLocaleDateString("en-TZ")} (${nextDays}d)`}
          </span>
        </div>
      )}
      {notes && (
        <div className="text-xs text-ink/50 italic pt-0.5">{notes}</div>
      )}
    </div>
  );
}

const VehicleCard = memo(({ vehicle, getDaysUntil, onEdit, onDelete }: {
  vehicle: Vehicle;
  getDaysUntil: (date: string) => number | null;
  onEdit: (v: Vehicle) => void;
  onDelete: (v: Vehicle) => void;
}) => {
  const dates = [vehicle.insurance_expiry, vehicle.operating_licence_expiry, vehicle.registration_expiry].filter(Boolean);
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
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
            <Car className="w-5 h-5 text-gold" />
          </div>
          <div>
            <div className="font-display text-lg text-paper font-medium leading-none">{vehicle.make} {vehicle.model}</div>
            <div className="text-paper/60 text-xs mt-0.5">{vehicle.year} · {vehicle.color}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(vehicle)} title="Edit vehicle"
            className="text-paper/40 hover:text-gold transition-colors p-1.5 rounded-lg hover:bg-paper/5">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(vehicle)} title="Delete vehicle"
            className="text-paper/40 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted uppercase tracking-widest">Plate</div>
            <div className="font-mono font-semibold text-ink text-sm mt-0.5">{vehicle.plate_number || "— TBD —"}</div>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${statusColors[vehicle.status] || "bg-gray-100 text-gray-600"}`}>
            {vehicle.status?.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs border-t border-ink/5 pt-3">
          <div><span className="text-ink/40">Category</span><br /><span className="text-ink font-medium">{vehicle.category}</span></div>
          <div><span className="text-ink/40">Seats</span><br /><span className="text-ink font-medium">{vehicle.seats}</span></div>
        </div>

        <div className="border-t border-ink/5 pt-3 space-y-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted uppercase tracking-widest">Documents</span>
            {docStatus === "ok" && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            {["warning", "critical", "expired"].includes(docStatus) && (
              <AlertTriangle className={`w-3.5 h-3.5 ${docStatus === "expired" ? "text-red-500" : docStatus === "critical" ? "text-red-400" : "text-amber-500"}`} />
            )}
          </div>
          <DocRow label="Insurance" days={getDaysUntil(vehicle.insurance_expiry)} date={vehicle.insurance_expiry} />
          <DocRow label="Operating Licence" days={getDaysUntil(vehicle.operating_licence_expiry)} date={vehicle.operating_licence_expiry} />
          <DocRow label="Registration" days={getDaysUntil(vehicle.registration_expiry)} date={vehicle.registration_expiry} />
          <DocRow label="Road Worthiness" days={getDaysUntil(vehicle.road_worthiness_expiry)} date={vehicle.road_worthiness_expiry} />
          <DocRow label="TRA Sticker" days={getDaysUntil(vehicle.tra_sticker_expiry)} date={vehicle.tra_sticker_expiry} />
        </div>

        <div className="border-t border-ink/5 pt-3">
          <div className="text-xs font-medium text-muted uppercase tracking-widest mb-2">Service</div>
          <ServiceRow last={vehicle.last_service_date} next={vehicle.next_service_date} notes={vehicle.service_notes} />
        </div>
      </div>
    </div>
  );
});
VehicleCard.displayName = "VehicleCard";

function DeleteVehicleModal({ vehicle, onClose, onDeleted }: {
  vehicle: Vehicle;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [blocked, setBlocked] = useState<{ count: number; message: string } | null>(null);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/vehicles/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vehicle.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "has_history") {
          setBlocked({ count: data.count, message: data.message });
        } else {
          setError(data.error || "Something went wrong");
        }
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Network error — try again");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">{blocked ? "Can't Delete" : "Delete Vehicle"}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="bg-paper-soft border border-ink/10 rounded-xl px-4 py-3">
            <div className="text-sm font-semibold text-ink">{vehicle.make} {vehicle.model}</div>
            <div className="text-xs text-muted mt-0.5">{vehicle.plate_number || "No plate"} · {vehicle.category}</div>
          </div>

          {blocked ? (
            <>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
                {blocked.message}
              </div>
              <p className="text-xs text-muted">
                If this car has been sold or is no longer in use, set its status to <strong className="text-ink">Maintenance</strong> for now so it stops appearing in booking options — its trip history stays intact for your reports.
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">
              This removes the vehicle from your fleet permanently. This can't be undone.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">
            {blocked ? "Close" : "Cancel"}
          </button>
          {!blocked && (
            <button onClick={handleDelete} disabled={deleting}
              className="px-5 py-2.5 text-sm bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Deleting..." : "Delete Vehicle"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Declared at module level on purpose. If this lived inside VehicleForm it
// would be a brand-new component on every keystroke, so React would tear down
// the input and rebuild it — which is what makes the caret jump to the end.
function F({ label, value, onChange, type = "text", options }: any) {
  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium">{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold">
          {options.map((o: string) => <option key={o} value={o}>{o.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} autoComplete="off"
          className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors" />
      )}
    </div>
  );
}

function VehicleForm({ vehicle, onClose, onSave }: {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [make, setMake] = useState(vehicle?.make || "");
  const [model, setModel] = useState(vehicle?.model || "");
  const [year, setYear] = useState(vehicle?.year?.toString() || "");
  const [plate, setPlate] = useState(vehicle?.plate_number || "");
  const [category, setCategory] = useState(vehicle?.category || "Executive");
  const [seats, setSeats] = useState(vehicle?.seats?.toString() || "");
  const [color, setColor] = useState(vehicle?.color || "");
  const [status, setStatus] = useState(vehicle?.status || "available");
  const [insuranceExpiry, setInsuranceExpiry] = useState(vehicle?.insurance_expiry?.split("T")[0] || "");
  const [operatingLicenceExpiry, setOperatingLicenceExpiry] = useState(vehicle?.operating_licence_expiry?.split("T")[0] || "");
  const [registrationExpiry, setRegistrationExpiry] = useState(vehicle?.registration_expiry?.split("T")[0] || "");
  const [roadWorthinessExpiry, setRoadWorthinessExpiry] = useState(vehicle?.road_worthiness_expiry?.split("T")[0] || "");
  const [traExpiry, setTraExpiry] = useState(vehicle?.tra_sticker_expiry?.split("T")[0] || "");
  const [lastServiceDate, setLastServiceDate] = useState(vehicle?.last_service_date?.split("T")[0] || "");
  const [nextServiceDate, setNextServiceDate] = useState(vehicle?.next_service_date?.split("T")[0] || "");
  const [serviceNotes, setServiceNotes] = useState(vehicle?.service_notes || "");
  const [notes, setNotes] = useState(vehicle?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/vehicles", {
      method: vehicle ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: vehicle?.id, make, model, year: parseInt(year) || null,
        plate_number: plate || null, category, seats: parseInt(seats) || null,
        color: color || null, status,
        insurance_expiry: insuranceExpiry || null,
        operating_licence_expiry: operatingLicenceExpiry || null,
        registration_expiry: registrationExpiry || null,
        road_worthiness_expiry: roadWorthinessExpiry || null,
        tra_sticker_expiry: traExpiry || null,
        last_service_date: lastServiceDate || null,
        next_service_date: nextServiceDate || null,
        service_notes: serviceNotes || null,
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
          <h2 className="font-display text-xl font-medium">{vehicle ? "Edit Vehicle" : "Add Vehicle"}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F label="Make *" value={make} onChange={setMake} />
          <F label="Model *" value={model} onChange={setModel} />
          <F label="Year" value={year} onChange={setYear} type="number" />
          <F label="Plate Number" value={plate} onChange={setPlate} />
          <F label="Category" value={category} onChange={setCategory} options={["VIP / Safari", "Executive", "Group / Events", "Mid-Group", "Safari / Family"]} />
          <F label="Seats" value={seats} onChange={setSeats} type="number" />
          <F label="Color" value={color} onChange={setColor} />
          <F label="Status" value={status} onChange={setStatus} options={["available", "on_hire", "maintenance"]} />

          <div className="sm:col-span-2"><p className="text-xs tracking-widest uppercase text-gold font-medium mt-2">Documents</p></div>
          <F label="Insurance Expiry" value={insuranceExpiry} onChange={setInsuranceExpiry} type="date" />
          <F label="Operating Licence Expiry" value={operatingLicenceExpiry} onChange={setOperatingLicenceExpiry} type="date" />
          <F label="Registration Expiry" value={registrationExpiry} onChange={setRegistrationExpiry} type="date" />
          <F label="Road Worthiness Expiry" value={roadWorthinessExpiry} onChange={setRoadWorthinessExpiry} type="date" />
          <F label="TRA Sticker Expiry" value={traExpiry} onChange={setTraExpiry} type="date" />

          <div className="sm:col-span-2"><p className="text-xs tracking-widest uppercase text-gold font-medium mt-2">Service</p></div>
          <F label="Last Service Date" value={lastServiceDate} onChange={setLastServiceDate} type="date" />
          <F label="Next Service Date (optional)" value={nextServiceDate} onChange={setNextServiceDate} type="date" />
          <div className="sm:col-span-2">
            <label className="block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium">Service Notes (what was done)</label>
            <input value={serviceNotes} onChange={e => setServiceNotes(e.target.value)} autoComplete="off" placeholder="e.g. Changed oil, replaced side mirror"
              className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={saving || !make || !model}
            className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
            {saving ? "Saving..." : vehicle ? "Update Vehicle" : "Add Vehicle"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const [filter, setFilter] = useState("all");

  const getDaysUntil = useCallback((date: string) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, []);

  const fetchVehicles = useCallback(async () => {
    const res = await fetch("/api/admin/vehicles");
    const data = await res.json();
    setVehicles(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleEdit = useCallback((v: Vehicle) => {
    setEditVehicle(v);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((v: Vehicle) => {
    setDeleteVehicle(v);
  }, []);

  const filtered = filter === "all" ? vehicles : vehicles.filter(v => v.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink">
            Fleet <em className="italic text-gold">Management</em>
          </h1>
          <p className="text-muted text-sm mt-1">
            {vehicles.length} vehicles · {vehicles.filter(v => v.status === "available").length} available
          </p>
        </div>
        <button onClick={() => { setEditVehicle(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors rounded-xl">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "available", "on_hire", "maintenance"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f ? "bg-ink text-paper" : "bg-paper text-muted border border-ink/10 hover:border-ink/30"
            }`}>
            {f === "all" ? "All Vehicles" : f.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm animate-pulse">Loading fleet...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-paper rounded-2xl border border-ink/10">
          <Car className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">No vehicles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(vehicle => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} getDaysUntil={getDaysUntil} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showForm && (
        <VehicleForm
          vehicle={editVehicle}
          onClose={() => setShowForm(false)}
          onSave={() => { fetchVehicles(); setShowForm(false); }}
        />
      )}

      {deleteVehicle && (
        <DeleteVehicleModal
          vehicle={deleteVehicle}
          onClose={() => setDeleteVehicle(null)}
          onDeleted={() => { fetchVehicles(); setDeleteVehicle(null); }}
        />
      )}
    </div>
  );
}
