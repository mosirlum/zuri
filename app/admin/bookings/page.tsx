"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, CalendarCheck, Search, Eye, AlertTriangle, Trash2, FileText, Banknote, Edit, Users, X, Car, Printer } from "lucide-react";
import BookingDocuments from "@/components/BookingDocuments";
import { REGIONS, getLocations } from "@/lib/regions";

const SERVICE_TYPES = [
  { value: "car_hire", label: "Car Hire" },
  { value: "port_shuttle", label: "Port Shuttle" },
  { value: "executive_transport", label: "Executive Transport" },
  { value: "group_transportation", label: "Group Transportation" },
  { value: "vip_wedding", label: "VIP & Wedding" },
  { value: "tours_safari", label: "Tours & Safari" },
  { value: "other", label: "Other" },
];

const getServiceLabel = (v: string) => SERVICE_TYPES.find(s => s.value === v)?.label || v;

const daysBetween = (from: string, to: Date = new Date()) => {
  if (!from) return null;
  return Math.floor((to.getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
};

const getTotalCost = (b: any) => (parseFloat(b.trip_cost) || 0) + (parseFloat(b.owner_payout_amount) || 0);

const vehicleName = (bv: any) =>
  bv.is_borrowed
    ? (bv.borrowed_vehicle_desc || "Borrowed vehicle")
    : [bv.vehicle_make, bv.vehicle_model].filter(Boolean).join(" ") || "Vehicle";

// A job can run on several cars. Show the one name when there's one, a count
// when there are more.
const fleetSummary = (b: any) => {
  const list = b.vehicles || [];
  if (list.length === 0) return "—";
  if (list.length === 1) return vehicleName(list[0]);
  return `${list.length} vehicles`;
};

type Stage = "confirmed" | "invoiced" | "overdue" | "completed" | "cancelled";

function getStage(b: any): Stage {
  if (b.status === "cancelled") return "cancelled";
  if (b.status === "completed") return "completed";
  if (!b.invoice_number) return "confirmed";
  const days = daysBetween(b.invoice_date);
  if (days !== null && days > 30) return "overdue";
  return "invoiced";
}

const stageMeta: Record<Stage, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  invoiced: { label: "Invoiced", color: "bg-amber-100 text-amber-700" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-600" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-600" },
};

function StageBadge({ booking }: { booking: any }) {
  const stage = getStage(booking);
  const meta = stageMeta[stage];
  const days = stage === "invoiced" || stage === "overdue" ? daysBetween(booking.invoice_date) : null;
  return (
    <div>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
      {days !== null && <div className="text-[0.65rem] text-muted mt-0.5">{days}d since invoice</div>}
    </div>
  );
}

const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
const sel = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold";
const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";

// ── RECORD INVOICE ───────────────────────────────────────────────
function RecordInvoiceModal({ booking, onClose, onSave }: {
  booking: any; onClose: () => void; onSave: () => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(booking.invoice_number || "");
  const [invoiceDate, setInvoiceDate] = useState(booking.invoice_date?.split("T")[0] || new Date().toISOString().split("T")[0]);
  const [tripAmount, setTripAmount] = useState(booking.paid_amount?.toString() || "");
  const [tripNotes, setTripNotes] = useState(booking.trip_notes || "");
  const [rows, setRows] = useState<any[]>(
    (booking.vehicles || []).map((v: any) => ({
      ...v,
      fuel_rate: "",
      km_travelled: v.km_travelled?.toString() || "",
      fuel_cost: v.fuel_cost ? String(v.fuel_cost) : "",
      driver_allowance: v.driver_allowance ? String(v.driver_allowance) : "",
      emergency_cost: v.emergency_cost ? String(v.emergency_cost) : "",
      emergency_notes: v.emergency_notes || "",
      borrowed_payout_type: v.borrowed_payout_type === "percent" ? "percent" : "fixed",
      borrowed_payout_percent: v.borrowed_payout_percent ? String(v.borrowed_payout_percent) : "",
      borrowed_payout_fixed: v.borrowed_payout_fixed ? String(v.borrowed_payout_fixed) : "",
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isOutsideDSM = booking.dropoff_region !== "Dar es Salaam";
  const amount = parseFloat(tripAmount) || 0;
  const perVehicleShare = rows.length > 0 ? amount / rows.length : amount;

  const setRow = (i: number, patch: any) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const payoutOf = (r: any) => {
    if (!r.is_borrowed) return 0;
    if (r.borrowed_payout_type === "percent") {
      return perVehicleShare * ((parseFloat(r.borrowed_payout_percent) || 0) / 100);
    }
    return parseFloat(r.borrowed_payout_fixed) || 0;
  };

  const costOf = (r: any) =>
    (parseFloat(r.fuel_cost) || 0) + (parseFloat(r.driver_allowance) || 0) +
    (parseFloat(r.emergency_cost) || 0) + payoutOf(r);

  const totalCost = rows.reduce((s, r) => s + costOf(r), 0);
  const zuriNet = amount - totalCost;

  const applyFuelRate = (i: number) => {
    const r = rows[i];
    const km = parseFloat(r.km_travelled) || 0;
    const rate = parseFloat(r.fuel_rate) || 0;
    if (km > 0 && rate > 0) setRow(i, { fuel_cost: String(km * rate) });
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/admin/bookings/complete", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: booking.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        paid_amount: amount,
        trip_notes: tripNotes,
        vehicles: rows,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <div>
            <h2 className="font-display text-xl font-medium">Record Invoice &amp; Costs</h2>
            <p className="text-xs text-gold font-mono mt-0.5">{booking.booking_ref}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        <div className="mx-6 mt-4 p-4 bg-paper-soft rounded-xl border border-ink/10 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted">Customer:</span> <span className="font-medium">{booking.customer_name}</span></div>
            <div><span className="text-muted">Service:</span> <span className="font-medium">{getServiceLabel(booking.service_type)}</span></div>
            <div><span className="text-muted">From:</span> <span className="font-medium">{booking.pickup_location}, {booking.pickup_region}</span></div>
            <div><span className="text-muted">To:</span> <span className="font-medium">{booking.dropoff_location}, {booking.dropoff_region}</span></div>
          </div>
          {isOutsideDSM && (
            <div className="mt-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
              Outside Dar es Salaam — driver allowance applies
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Invoice</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Invoice Number *</label>
                <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} autoComplete="off" className={inp} />
              </div>
              <div>
                <label className={lbl}>Invoice Date *</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Amount Client Must Pay (TZS) *</label>
                <input type="number" value={tripAmount} onChange={e => setTripAmount(e.target.value)} autoComplete="off" className={inp} placeholder="0" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">
              Costs per Vehicle {rows.length > 1 && <span className="text-muted normal-case tracking-normal font-normal">· {rows.length} vehicles</span>}
            </p>

            {rows.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
                No vehicles on this booking.
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((r, i) => (
                  <div key={r.id || i} className={`rounded-xl border p-4 space-y-3 ${r.is_borrowed ? "border-purple-200 bg-purple-50/40" : "border-ink/10 bg-paper-soft"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {r.is_borrowed ? <Users className="w-4 h-4 text-purple-600" /> : <Car className="w-4 h-4 text-ink/50" />}
                        <span className="text-sm font-semibold text-ink">{vehicleName(r)}</span>
                        {r.plate_number && <span className="text-xs text-muted font-mono">{r.plate_number}</span>}
                      </div>
                      <span className="text-xs text-muted">{r.driver_name || "No driver"}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Km</label>
                        <input type="number" value={r.km_travelled} onChange={e => setRow(i, { km_travelled: e.target.value })} onBlur={() => applyFuelRate(i)} autoComplete="off" className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Rate / Km</label>
                        <input type="number" value={r.fuel_rate} onChange={e => setRow(i, { fuel_rate: e.target.value })} onBlur={() => applyFuelRate(i)} autoComplete="off" className={inp} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>⛽ Fuel</label>
                        <input type="number" value={r.fuel_cost} onChange={e => setRow(i, { fuel_cost: e.target.value })} autoComplete="off" className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>🧍 Allowance</label>
                        <input type="number" value={r.driver_allowance} onChange={e => setRow(i, { driver_allowance: e.target.value })} autoComplete="off" className={inp} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>🚨 Emergency</label>
                        <input type="number" value={r.emergency_cost} onChange={e => setRow(i, { emergency_cost: e.target.value })} autoComplete="off" className={inp} />
                      </div>
                      {parseFloat(r.emergency_cost) > 0 && (
                        <div>
                          <label className={lbl}>What happened</label>
                          <input value={r.emergency_notes} onChange={e => setRow(i, { emergency_notes: e.target.value })} autoComplete="off" className={inp} />
                        </div>
                      )}
                    </div>

                    {r.is_borrowed && (
                      <div className="pt-1">
                        <label className={lbl}>👤 Owner Payment {r.borrowed_owner_name ? `· ${r.borrowed_owner_name}` : ""}</label>
                        <div className="flex gap-2 mb-2">
                          <button type="button" onClick={() => setRow(i, { borrowed_payout_type: "fixed" })}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${r.borrowed_payout_type === "fixed" ? "bg-purple-600 text-white border-purple-600" : "bg-paper text-muted border-ink/15"}`}>
                            Amount
                          </button>
                          <button type="button" onClick={() => setRow(i, { borrowed_payout_type: "percent" })}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${r.borrowed_payout_type === "percent" ? "bg-purple-600 text-white border-purple-600" : "bg-paper text-muted border-ink/15"}`}>
                            Percent
                          </button>
                        </div>
                        {r.borrowed_payout_type === "fixed" ? (
                          <input type="number" value={r.borrowed_payout_fixed} onChange={e => setRow(i, { borrowed_payout_fixed: e.target.value })} autoComplete="off" className={inp} />
                        ) : (
                          <>
                            <input type="number" value={r.borrowed_payout_percent} onChange={e => setRow(i, { borrowed_payout_percent: e.target.value })} autoComplete="off" className={inp} placeholder="50" />
                            {payoutOf(r) > 0 && (
                              <p className="text-xs text-purple-700 mt-1.5">
                                = {Math.round(payoutOf(r)).toLocaleString()} of {Math.round(perVehicleShare).toLocaleString()} share
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between text-xs pt-1 border-t border-ink/10">
                      <span className="text-muted">Vehicle cost</span>
                      <span className="text-red-500 font-medium">-{Math.round(costOf(r)).toLocaleString()} TZS</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`rounded-xl p-4 border ${zuriNet >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-xs tracking-widest uppercase font-medium mb-3 text-muted">Zuri Net</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted">Invoiced</span><span className="text-green-600 font-medium">+{amount.toLocaleString()} TZS</span></div>
              {rows.map((r, i) => (
                <div key={r.id || i} className="flex justify-between">
                  <span className="text-muted">{vehicleName(r)}</span>
                  <span className="text-red-500">-{Math.round(costOf(r)).toLocaleString()} TZS</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-ink/10 pt-2 mt-1">
                <span className="font-semibold">{zuriNet >= 0 ? "Net Profit" : "Net Loss"}</span>
                <span className={`font-bold text-base ${zuriNet >= 0 ? "text-green-600" : "text-red-600"}`}>{zuriNet >= 0 ? "+" : ""}{Math.round(zuriNet).toLocaleString()} TZS</span>
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Trip Notes</label>
            <textarea value={tripNotes} onChange={e => setTripNotes(e.target.value)} rows={2}
              className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end sticky bottom-0 bg-paper">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={saving || !invoiceNumber || !invoiceDate || !tripAmount}
            className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
            {saving ? "Saving..." : "Save Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MARK PAID ────────────────────────────────────────────────────
function MarkPaidModal({ booking, onClose, onSave }: { booking: any; onClose: () => void; onSave: () => void }) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/admin/bookings/payment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, payment_method: paymentMethod, payment_received_date: paymentDate }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSave();
  };

  const owed = parseFloat(booking.owner_payout_amount) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-medium">Mark as Paid</h2>
            <p className="text-xs text-gold font-mono mt-0.5">{booking.booking_ref}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <div className="bg-paper-soft border border-ink/10 rounded-xl px-4 py-3 text-sm flex justify-between">
            <span className="text-muted">Invoiced</span>
            <span className="font-semibold text-ink">{(parseFloat(booking.paid_amount)||0).toLocaleString()} TZS</span>
          </div>
          {owed > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm flex justify-between">
              <span className="text-purple-700">Owed to vehicle owners</span>
              <span className="font-semibold text-purple-700">{Math.round(owed).toLocaleString()} TZS</span>
            </div>
          )}
          <div>
            <label className={lbl}>Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={sel}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mpesa">M-Pesa</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Date Received</label>
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inp} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={saving || !paymentDate}
            className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
            {saving ? "Saving..." : "Confirm Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── VIEW ─────────────────────────────────────────────────────────
function ViewBookingModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  const paidAmount = parseFloat(booking.paid_amount) || 0;
  const cost = getTotalCost(booking);
  const tripProfit = paidAmount - cost;
  const stage = getStage(booking);
  const daysOutstanding = (stage === "invoiced" || stage === "overdue") ? daysBetween(booking.invoice_date) : null;
  const list = booking.vehicles || [];

  const costOf = (bv: any) =>
    (parseFloat(bv.fuel_cost) || 0) + (parseFloat(bv.driver_allowance) || 0) +
    (parseFloat(bv.emergency_cost) || 0) + (parseFloat(bv.owner_payout_amount) || 0);

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <div>
            <h2 className="font-display text-xl font-medium">Booking Details</h2>
            <p className="text-xs text-gold font-mono mt-0.5">{booking.booking_ref}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <StageBadge booking={booking} />
            <span className="text-xs text-muted">{getServiceLabel(booking.service_type)}</span>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Customer</p>
            <p className="text-sm font-semibold text-ink">{booking.customer_name}</p>
            <p className="text-xs text-muted">{booking.customer_phone}</p>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Trip</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex gap-2"><span className="text-muted w-16">From:</span><span>{booking.pickup_location}, {booking.pickup_region}</span></div>
              <div className="flex gap-2"><span className="text-muted w-16">To:</span><span>{booking.dropoff_location}, {booking.dropoff_region}</span></div>
              <div className="flex gap-2"><span className="text-muted w-16">Date:</span><span>{booking.pickup_datetime ? new Date(booking.pickup_datetime).toLocaleString("en-TZ") : "—"}</span></div>
            </div>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">
              Vehicles {list.length > 1 && <span className="text-muted font-normal">· {list.length}</span>}
            </p>
            <div className="space-y-2">
              {list.length === 0 ? (
                <p className="text-sm text-muted">None assigned.</p>
              ) : list.map((bv: any, i: number) => (
                <div key={bv.id || i} className={`rounded-xl border p-3 ${bv.is_borrowed ? "border-purple-200 bg-purple-50/40" : "border-ink/10 bg-paper-soft"}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {bv.is_borrowed ? <Users className="w-3.5 h-3.5 text-purple-600" /> : <Car className="w-3.5 h-3.5 text-ink/50" />}
                      <span className="text-sm font-medium text-ink">{vehicleName(bv)}</span>
                      {bv.plate_number && <span className="text-xs text-muted font-mono">{bv.plate_number}</span>}
                    </div>
                    <span className="text-xs text-muted">{bv.driver_name || "—"}</span>
                  </div>
                  {bv.is_borrowed && bv.borrowed_owner_name && (
                    <div className="text-xs text-purple-700 mt-1">
                      Owner: {bv.borrowed_owner_name}{bv.borrowed_owner_phone ? ` · ${bv.borrowed_owner_phone}` : ""}
                    </div>
                  )}
                  {booking.invoice_number && (
                    <div className="mt-2 pt-2 border-t border-ink/10 grid grid-cols-2 gap-1 text-xs">
                      {bv.km_travelled && <div><span className="text-muted">Km:</span> {parseFloat(bv.km_travelled).toLocaleString()}</div>}
                      <div><span className="text-muted">Fuel:</span> {(parseFloat(bv.fuel_cost)||0).toLocaleString()}</div>
                      {parseFloat(bv.driver_allowance) > 0 && <div><span className="text-muted">Allowance:</span> {parseFloat(bv.driver_allowance).toLocaleString()}</div>}
                      {parseFloat(bv.emergency_cost) > 0 && <div><span className="text-muted">Emergency:</span> {parseFloat(bv.emergency_cost).toLocaleString()}</div>}
                      {parseFloat(bv.owner_payout_amount) > 0 && <div><span className="text-muted">Owner:</span> {Math.round(parseFloat(bv.owner_payout_amount)).toLocaleString()}</div>}
                      <div className="col-span-2 pt-1 flex justify-between font-medium">
                        <span className="text-muted">Total</span>
                        <span className="text-red-500">-{Math.round(costOf(bv)).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {booking.travel_details && (
            <div>
              <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Travel Details</p>
              <p className="text-sm text-ink bg-paper-soft rounded-xl p-3">{booking.travel_details}</p>
            </div>
          )}

          {booking.invoice_number && (
            <>
              <div>
                <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Zuri Net</p>
                <div className={`rounded-xl p-4 border ${tripProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted">Invoiced</span><span className="text-green-600 font-medium">+{paidAmount.toLocaleString()} TZS</span></div>
                    <div className="flex justify-between"><span className="text-muted">All vehicle costs</span><span className="text-red-500">-{Math.round(cost).toLocaleString()} TZS</span></div>
                    <div className="flex justify-between border-t border-ink/10 pt-2 mt-1">
                      <span className="font-semibold">{tripProfit >= 0 ? "Net Profit" : "Net Loss"}</span>
                      <span className={`font-bold ${tripProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{tripProfit >= 0 ? "+" : ""}{Math.round(tripProfit).toLocaleString()} TZS</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Payment</p>
                <div className="bg-paper-soft rounded-xl p-4 border border-ink/10 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted">Invoice</span><span className="text-ink">{booking.invoice_number}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Date</span><span className="text-ink">{new Date(booking.invoice_date).toLocaleDateString("en-TZ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Status</span><StageBadge booking={booking} /></div>
                  {stage === "completed" && (
                    <>
                      <div className="flex justify-between"><span className="text-muted">Paid via</span><span className="text-ink capitalize">{booking.payment_method?.replace("_"," ") || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Received</span><span className="text-ink">{booking.payment_received_date ? new Date(booking.payment_received_date).toLocaleDateString("en-TZ") : "—"}</span></div>
                    </>
                  )}
                  {daysOutstanding !== null && (
                    <div className="flex justify-between"><span className="text-muted">Outstanding</span><span className={daysOutstanding > 30 ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>{daysOutstanding} days</span></div>
                  )}
                </div>
              </div>
            </>
          )}

          {booking.trip_notes && (
            <div>
              <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Notes</p>
              <p className="text-sm text-ink bg-paper-soft rounded-xl p-3">{booking.trip_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NEW BOOKING ──────────────────────────────────────────────────
function BookingForm({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [fleet, setFleet] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [serviceType, setServiceType] = useState("car_hire");
  const [rows, setRows] = useState<any[]>([
    { source: "fleet", vehicle_id: "", driver_id: "", borrowed_vehicle_desc: "", borrowed_owner_name: "", borrowed_owner_phone: "" },
  ]);
  const [pickupRegion, setPickupRegion] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupLocations, setPickupLocations] = useState<string[]>([]);
  const [pickupCustom, setPickupCustom] = useState(false);
  const [pickupCustomText, setPickupCustomText] = useState("");
  const [dropRegion, setDropRegion] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [dropLocations, setDropLocations] = useState<string[]>([]);
  const [dropCustom, setDropCustom] = useState(false);
  const [dropCustomText, setDropCustomText] = useState("");
  const [pickupDatetime, setPickupDatetime] = useState("");
  const [dropoffDatetime, setDropoffDatetime] = useState("");
  const [travelDetails, setTravelDetails] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/admin/vehicles").then(r => r.json()).then(d => setFleet(d.filter((v: any) => v.status === "available")));
    fetch("/api/admin/drivers").then(r => r.json()).then(d => setDrivers(d));
  }, []);

  const handlePickupRegion = (r: string) => { setPickupRegion(r); setPickupLocation(""); setPickupCustom(false); setPickupLocations(r ? getLocations(r) : []); };
  const handlePickupLocation = (l: string) => { if (l === "Other (specify below)") { setPickupCustom(true); setPickupLocation(""); } else { setPickupCustom(false); setPickupLocation(l); } };
  const handleDropRegion = (r: string) => { setDropRegion(r); setDropLocation(""); setDropCustom(false); setDropLocations(r ? getLocations(r) : []); };
  const handleDropLocation = (l: string) => { if (l === "Other (specify below)") { setDropCustom(true); setDropLocation(""); } else { setDropCustom(false); setDropLocation(l); } };

  const setRow = (i: number, patch: any) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () =>
    setRows(prev => [...prev, { source: "fleet", vehicle_id: "", driver_id: "", borrowed_vehicle_desc: "", borrowed_owner_name: "", borrowed_owner_phone: "" }]);
  const removeRow = (i: number) =>
    setRows(prev => prev.filter((_, idx) => idx !== i));

  // A car already picked on another row shouldn't be selectable twice.
  const takenIds = rows.map(r => r.vehicle_id).filter(Boolean);

  const rowValid = (r: any) =>
    r.source === "borrowed" ? !!(r.borrowed_vehicle_desc && r.borrowed_owner_name) : !!r.vehicle_id;
  const canSave = customerName && rows.length > 0 && rows.every(rowValid);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: customerName, customer_phone: customerPhone,
        customer_email: customerEmail, status: "confirmed",
        service_type: serviceType,
        vehicles: rows.map(r => ({
          is_borrowed: r.source === "borrowed",
          vehicle_id: r.source === "borrowed" ? null : (r.vehicle_id || null),
          driver_id: r.driver_id || null,
          borrowed_vehicle_desc: r.source === "borrowed" ? r.borrowed_vehicle_desc : null,
          borrowed_owner_name: r.source === "borrowed" ? r.borrowed_owner_name : null,
          borrowed_owner_phone: r.source === "borrowed" ? r.borrowed_owner_phone : null,
        })),
        pickup_region: pickupRegion, pickup_location: pickupCustom ? pickupCustomText : pickupLocation,
        dropoff_region: dropRegion, dropoff_location: dropCustom ? dropCustomText : dropLocation,
        pickup_datetime: pickupDatetime || null, dropoff_datetime: dropoffDatetime || null,
        travel_details: travelDetails || null, notes: notes || null,
      }),
    });
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <h2 className="font-display text-xl font-medium">New Booking</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Customer</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Name *</label><input value={customerName} onChange={e => setCustomerName(e.target.value)} autoComplete="off" className={inp} /></div>
              <div><label className={lbl}>Phone</label><input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} autoComplete="off" className={inp} /></div>
              <div className="sm:col-span-2"><label className={lbl}>Email</label><input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} autoComplete="off" className={inp} /></div>
            </div>
          </div>

          <div>
            <label className={lbl}>Service Type</label>
            <select value={serviceType} onChange={e => setServiceType(e.target.value)} className={sel}>
              {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs tracking-widest uppercase text-gold font-medium">
                Vehicles &amp; Drivers {rows.length > 1 && <span className="text-muted normal-case tracking-normal font-normal">· {rows.length}</span>}
              </p>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1.5 text-xs bg-ink text-paper px-3 py-1.5 rounded-lg font-medium hover:bg-gold hover:text-ink transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((r, i) => {
                const borrowed = r.source === "borrowed";
                return (
                  <div key={i} className={`rounded-xl border p-4 space-y-3 ${borrowed ? "border-purple-200 bg-purple-50/40" : "border-ink/10 bg-paper-soft"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setRow(i, { source: "fleet" })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${!borrowed ? "bg-ink text-paper border-ink" : "bg-paper text-muted border-ink/15"}`}>
                          My fleet
                        </button>
                        <button type="button" onClick={() => setRow(i, { source: "borrowed" })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${borrowed ? "bg-purple-600 text-white border-purple-600" : "bg-paper text-muted border-ink/15"}`}>
                          Borrowed
                        </button>
                      </div>
                      {rows.length > 1 && (
                        <button type="button" onClick={() => removeRow(i)} title="Remove"
                          className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {!borrowed ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>Vehicle *</label>
                          <select value={r.vehicle_id} onChange={e => setRow(i, { vehicle_id: e.target.value })} className={sel}>
                            <option value="">— Select —</option>
                            {fleet
                              .filter((v: any) => !takenIds.includes(String(v.id)) || String(v.id) === String(r.vehicle_id))
                              .map((v: any) => (
                                <option key={v.id} value={v.id}>
                                  {v.make} {v.model} ({v.seats}){v.plate_number ? ` · ${v.plate_number}` : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Driver</label>
                          <select value={r.driver_id} onChange={e => setRow(i, { driver_id: e.target.value })} className={sel}>
                            <option value="">— Select —</option>
                            {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className={lbl}>Vehicle *</label>
                          <input value={r.borrowed_vehicle_desc} onChange={e => setRow(i, { borrowed_vehicle_desc: e.target.value })} autoComplete="off" className={inp} placeholder="Toyota Coaster 26-seat" />
                        </div>
                        <div>
                          <label className={lbl}>Owner *</label>
                          <input value={r.borrowed_owner_name} onChange={e => setRow(i, { borrowed_owner_name: e.target.value })} autoComplete="off" className={inp} />
                        </div>
                        <div>
                          <label className={lbl}>Owner Phone</label>
                          <input value={r.borrowed_owner_phone} onChange={e => setRow(i, { borrowed_owner_phone: e.target.value })} autoComplete="off" className={inp} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={lbl}>Driver</label>
                          <select value={r.driver_id} onChange={e => setRow(i, { driver_id: e.target.value })} className={sel}>
                            <option value="">— Select —</option>
                            {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Trip</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Pickup Region</label>
                <select value={pickupRegion} onChange={e => handlePickupRegion(e.target.value)} className={sel}>
                  <option value="">— Select —</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Pickup Location</label>
                {!pickupRegion ? (
                  <input disabled className="w-full border border-ink/15 bg-paper-soft text-muted px-3 py-2.5 rounded-lg text-sm cursor-not-allowed" />
                ) : (
                  <select value={pickupCustom ? "Other (specify below)" : pickupLocation} onChange={e => handlePickupLocation(e.target.value)} className={sel}>
                    <option value="">— Select —</option>
                    {pickupLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
              </div>
              {pickupCustom && (
                <div className="sm:col-span-2"><label className={lbl}>Specify Pickup</label>
                  <input value={pickupCustomText} onChange={e => setPickupCustomText(e.target.value)} autoFocus autoComplete="off" className={`${inp} border-gold/50`} />
                </div>
              )}
              <div><label className={lbl}>Drop Region</label>
                <select value={dropRegion} onChange={e => handleDropRegion(e.target.value)} className={sel}>
                  <option value="">— Select —</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Drop Location</label>
                {!dropRegion ? (
                  <input disabled className="w-full border border-ink/15 bg-paper-soft text-muted px-3 py-2.5 rounded-lg text-sm cursor-not-allowed" />
                ) : (
                  <select value={dropCustom ? "Other (specify below)" : dropLocation} onChange={e => handleDropLocation(e.target.value)} className={sel}>
                    <option value="">— Select —</option>
                    {dropLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
              </div>
              {dropCustom && (
                <div className="sm:col-span-2"><label className={lbl}>Specify Drop</label>
                  <input value={dropCustomText} onChange={e => setDropCustomText(e.target.value)} autoFocus autoComplete="off" className={`${inp} border-gold/50`} />
                </div>
              )}
              <div><label className={lbl}>Pickup Date &amp; Time</label><input type="datetime-local" value={pickupDatetime} onChange={e => setPickupDatetime(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Drop Date &amp; Time</label><input type="datetime-local" value={dropoffDatetime} onChange={e => setDropoffDatetime(e.target.value)} className={inp} /></div>
              <div className="sm:col-span-2"><label className={lbl}>Travel Details</label>
                <textarea value={travelDetails} onChange={e => setTravelDetails(e.target.value)} rows={3}
                  className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold resize-none" />
              </div>
              <div className="sm:col-span-2"><label className={lbl}>Internal Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold resize-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end sticky bottom-0 bg-paper">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={saving || !canSave}
            className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
            {saving ? "Creating..." : "Create Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState<any>(null);
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [viewBooking, setViewBooking] = useState<any>(null);
  const [docsBooking, setDocsBooking] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | Stage>("all");

  const fetchBookings = useCallback(async () => {
    const res = await fetch("/api/admin/bookings");
    const data = await res.json();
    setBookings(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const deleteBooking = async (id: number, ref: string) => {
    if (!confirm(`Delete ${ref}? Linked expenses go too. This cannot be undone.`)) return;
    await fetch("/api/admin/bookings/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchBookings();
  };

  const cancelBooking = async (id: number) => {
    await fetch("/api/admin/bookings/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    fetchBookings();
  };

  const filtered = bookings.filter(b => {
    const matchStage = stageFilter === "all" || getStage(b) === stageFilter;
    const matchSearch = !search ||
      b.booking_ref?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup_location?.toLowerCase().includes(search.toLowerCase());
    return matchStage && matchSearch;
  });

  const isInvoiced = (b: any) => !!b.invoice_number;
  const totalRevenue = bookings.filter(isInvoiced).reduce((s, b) => s + parseFloat(b.paid_amount||0), 0);
  const totalTripCost = bookings.filter(isInvoiced).reduce((s, b) => s + getTotalCost(b), 0);
  const totalProfit = totalRevenue - totalTripCost;
  const outstandingBookings = bookings.filter(b => isInvoiced(b) && b.payment_status !== "paid");
  const outstanding = outstandingBookings.reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink">
            Booking <em className="italic text-gold">Management</em>
          </h1>
          <p className="text-muted text-sm mt-1">
            {bookings.length} total · {bookings.filter(b => getStage(b) === "confirmed").length} awaiting invoice · {bookings.filter(b => getStage(b) === "completed").length} completed
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors rounded-xl">
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="text-xs tracking-widest uppercase text-green-700 mb-1">Revenue</div>
          <div className="font-display text-2xl font-medium text-green-700">{totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-green-600 mt-0.5">TZS</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="text-xs tracking-widest uppercase text-red-700 mb-1">Trip Costs</div>
          <div className="font-display text-2xl font-medium text-red-600">{Math.round(totalTripCost).toLocaleString()}</div>
          <div className="text-xs text-red-500 mt-0.5">TZS</div>
        </div>
        <div className={`border rounded-2xl p-4 ${totalProfit >= 0 ? "bg-gold/10 border-gold/30" : "bg-red-100 border-red-300"}`}>
          <div className={`text-xs tracking-widest uppercase mb-1 ${totalProfit >= 0 ? "text-gold" : "text-red-700"}`}>Net from Trips</div>
          <div className={`font-display text-2xl font-medium ${totalProfit >= 0 ? "text-gold" : "text-red-700"}`}>{Math.round(totalProfit).toLocaleString()}</div>
          <div className={`text-xs mt-0.5 ${totalProfit >= 0 ? "text-gold" : "text-red-600"}`}>TZS</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="text-xs tracking-widest uppercase text-amber-700 mb-1">Outstanding</div>
          <div className="font-display text-2xl font-medium text-amber-700">{outstanding.toLocaleString()}</div>
          <div className="text-xs text-amber-600 mt-0.5">TZS · {outstandingBookings.length} unpaid</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" placeholder="Search ref, customer or location"
            value={search} onChange={e => setSearch(e.target.value)} autoComplete="off"
            className="w-full pl-10 pr-4 py-2.5 border border-ink/15 rounded-xl text-sm bg-paper outline-none focus:border-gold" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all","confirmed","invoiced","overdue","completed","cancelled"] as const).map(s => (
            <button key={s} onClick={() => setStageFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                stageFilter === s ? "bg-ink text-paper" : "bg-paper text-muted border border-ink/10 hover:border-ink/30"
              }`}>
              {s === "all" ? "All" : stageMeta[s].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm animate-pulse">Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-paper rounded-2xl border border-ink/10">
          <CalendarCheck className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">No bookings found.</p>
        </div>
      ) : (
        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/10 bg-paper-soft">
                  {["Ref","Customer","Service","Route","Vehicles","Date","Revenue","Zuri Net","Stage","Actions"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs tracking-widest uppercase text-muted font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {filtered.map(b => {
                  const paid = parseFloat(b.paid_amount) || 0;
                  const cost = getTotalCost(b);
                  const profit = paid - cost;
                  const stage = getStage(b);
                  const invoiced = isInvoiced(b);
                  const list = b.vehicles || [];
                  const hasBorrowed = list.some((v: any) => v.is_borrowed);

                  return (
                    <tr key={b.id} className="hover:bg-paper-soft transition-colors">
                      <td className="px-3 py-3 text-xs font-mono font-semibold text-gold whitespace-nowrap">{b.booking_ref}</td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-ink whitespace-nowrap">{b.customer_name || "—"}</div>
                        <div className="text-xs text-muted">{b.customer_phone || ""}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-soft whitespace-nowrap">{getServiceLabel(b.service_type)}</td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-ink">{b.pickup_region}</div>
                        <div className="text-xs text-muted">→ {b.dropoff_region}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-soft whitespace-nowrap">
                        {fleetSummary(b)}
                        {hasBorrowed && (
                          <span className="ml-1.5 text-[0.6rem] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">Borrowed</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted whitespace-nowrap">
                        {b.pickup_datetime ? new Date(b.pickup_datetime).toLocaleDateString("en-TZ",{day:"numeric",month:"short",year:"2-digit"}) : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {invoiced ? <span className="text-green-600 font-semibold">+{paid.toLocaleString()}</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {invoiced ? (
                          <span className={`font-semibold ${profit >= 0 ? "text-gold" : "text-red-500"}`}>{profit >= 0 ? "+" : ""}{Math.round(profit).toLocaleString()}</span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-3"><StageBadge booking={b} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewBooking(b)} title="View"
                            className="p-1.5 text-muted hover:text-ink hover:bg-ink/5 rounded-lg transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {stage === "confirmed" && (
                            <button onClick={() => setInvoiceBooking(b)} title="Record invoice"
                              className="p-1.5 text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(stage === "invoiced" || stage === "overdue" || stage === "completed") && (
                            <button onClick={() => setDocsBooking(b)} title="Print documents"
                              className="p-1.5 text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors">
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(stage === "invoiced" || stage === "overdue") && (
                            <>
                              <button onClick={() => setInvoiceBooking(b)} title="Edit invoice"
                                className="p-1.5 text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setPaymentBooking(b)} title="Mark paid"
                                className="p-1.5 text-muted hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <Banknote className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {stage === "confirmed" && (
                            <button onClick={() => { if(confirm("Cancel this booking?")) cancelBooking(b.id); }} title="Cancel"
                              className="p-1.5 text-muted hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteBooking(b.id, b.booking_ref)} title="Delete"
                            className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <BookingForm onClose={() => setShowForm(false)} onSave={() => { fetchBookings(); setShowForm(false); }} />}
      {invoiceBooking && <RecordInvoiceModal booking={invoiceBooking} onClose={() => setInvoiceBooking(null)} onSave={() => { fetchBookings(); setInvoiceBooking(null); }} />}
      {paymentBooking && <MarkPaidModal booking={paymentBooking} onClose={() => setPaymentBooking(null)} onSave={() => { fetchBookings(); setPaymentBooking(null); }} />}
      {viewBooking && <ViewBookingModal booking={viewBooking} onClose={() => setViewBooking(null)} />}
      {docsBooking && <BookingDocuments booking={docsBooking} onClose={() => setDocsBooking(null)} onSaved={fetchBookings} />}
    </div>
  );
}
