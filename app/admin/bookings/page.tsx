"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, CalendarCheck, Search, Eye, AlertTriangle, Trash2, FileText, Banknote, Edit, Users } from "lucide-react";
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

const getVehicleLabel = (b: any) => {
  if (b.is_borrowed_vehicle) return b.borrowed_vehicle_desc || "Borrowed vehicle";
  return b.vehicle_make ? `${b.vehicle_make} ${b.vehicle_model}` : "—";
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

function RecordInvoiceModal({ booking, onClose, onSave }: {
  booking: any; onClose: () => void; onSave: () => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(booking.invoice_number || "");
  const [invoiceDate, setInvoiceDate] = useState(booking.invoice_date?.split("T")[0] || new Date().toISOString().split("T")[0]);
  const [tripAmount, setTripAmount] = useState(booking.paid_amount?.toString() || "");
  const [kmTravelled, setKmTravelled] = useState(booking.km_travelled?.toString() || "");
  const [fuelRate, setFuelRate] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [driverAllowance, setDriverAllowance] = useState("");
  const [emergencyCost, setEmergencyCost] = useState("");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [tripNotes, setTripNotes] = useState(booking.trip_notes || "");
  const [payoutType, setPayoutType] = useState<"percent" | "fixed">(booking.borrowed_payout_type === "percent" ? "percent" : "fixed");
  const [payoutPercent, setPayoutPercent] = useState(booking.borrowed_payout_percent?.toString() || "");
  const [payoutFixed, setPayoutFixed] = useState(booking.borrowed_payout_fixed?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isOutsideDSM = booking.dropoff_region !== "Dar es Salaam";
  const isBorrowed = !!booking.is_borrowed_vehicle;
  const ownerPayout = !isBorrowed ? 0
    : payoutType === "percent" ? (parseFloat(tripAmount) || 0) * ((parseFloat(payoutPercent) || 0) / 100)
    : (parseFloat(payoutFixed) || 0);

  const totalTripCost = (parseFloat(fuelCost)||0) + (parseFloat(driverAllowance)||0) + (parseFloat(emergencyCost)||0);
  const zuriNet = (parseFloat(tripAmount)||0) - totalTripCost - ownerPayout;

  const applyFuelRate = () => {
    const km = parseFloat(kmTravelled) || 0;
    const rate = parseFloat(fuelRate) || 0;
    if (km > 0 && rate > 0) setFuelCost((km * rate).toString());
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
        paid_amount: parseFloat(tripAmount) || 0,
        km_travelled: kmTravelled ? parseFloat(kmTravelled) : null,
        fuel_cost: parseFloat(fuelCost) || 0,
        driver_allowance: parseFloat(driverAllowance) || 0,
        emergency_cost: parseFloat(emergencyCost) || 0,
        emergency_notes: emergencyNotes,
        trip_notes: tripNotes,
        borrowed_payout_type: isBorrowed ? payoutType : null,
        borrowed_payout_percent: isBorrowed && payoutType === "percent" ? parseFloat(payoutPercent) || 0 : null,
        borrowed_payout_fixed: isBorrowed && payoutType === "fixed" ? parseFloat(payoutFixed) || 0 : null,
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

  const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
  const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <div>
            <h2 className="font-display text-xl font-medium">Record Invoice & Costs</h2>
            <p className="text-xs text-gold font-mono mt-0.5">{booking.booking_ref}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        <div className="mx-6 mt-4 p-4 bg-paper-soft rounded-xl border border-ink/10 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted">Customer:</span> <span className="font-medium">{booking.customer_name}</span></div>
            <div><span className="text-muted">Service:</span> <span className="font-medium">{getServiceLabel(booking.service_type)}</span></div>
            <div><span className="text-muted">Vehicle:</span> <span className="font-medium">{getVehicleLabel(booking)}</span></div>
            <div><span className="text-muted">Driver:</span> <span className="font-medium">{booking.driver_name}</span></div>
            <div><span className="text-muted">From:</span> <span className="font-medium">{booking.pickup_location}, {booking.pickup_region}</span></div>
            <div><span className="text-muted">To:</span> <span className="font-medium">{booking.dropoff_location}, {booking.dropoff_region}</span></div>
          </div>
          {isOutsideDSM && (
            <div className="mt-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
              ⚠️ Outside Dar es Salaam — driver allowance applies
            </div>
          )}
          {isBorrowed && (
            <div className="mt-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              Borrowed from {booking.borrowed_owner_name || "owner"}
              {booking.borrowed_owner_phone ? ` · ${booking.borrowed_owner_phone}` : ""}
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
                <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} autoComplete="off" className={inp} placeholder="e.g. INV-2026-014" />
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
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Trip Costs</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Km Travelled</label>
                  <input type="number" value={kmTravelled} onChange={e => setKmTravelled(e.target.value)} onBlur={applyFuelRate} autoComplete="off" className={inp} placeholder="0" />
                </div>
                <div>
                  <label className={lbl}>Fuel Rate / Km (optional)</label>
                  <input type="number" value={fuelRate} onChange={e => setFuelRate(e.target.value)} onBlur={applyFuelRate} autoComplete="off" className={inp} placeholder="e.g. 800" />
                </div>
              </div>
              <div>
                <label className={lbl}>
                  ⛽ Fuel Cost (TZS) *
                  <span className="ml-2 text-muted normal-case font-normal">auto-fills from km × rate, or enter directly</span>
                </label>
                <input type="number" value={fuelCost} onChange={e => setFuelCost(e.target.value)} autoComplete="off" className={inp} placeholder="Enter fuel cost" />
              </div>
              <div>
                <label className={lbl}>
                  🧍 Driver Allowance (TZS)
                  {!isOutsideDSM
                    ? <span className="ml-2 text-green-600 normal-case font-normal">· Within DSM — not required</span>
                    : <span className="ml-2 text-amber-600 normal-case font-normal">· Outside DSM — enter amount</span>
                  }
                </label>
                <input type="number" value={driverAllowance} onChange={e => setDriverAllowance(e.target.value)}
                  autoComplete="off" className={inp}
                  placeholder={isOutsideDSM ? "Enter driver allowance" : "0 — trip within Dar es Salaam"} />
              </div>

              {isBorrowed && (
                <div className="border border-purple-200 rounded-xl p-4 bg-purple-50">
                  <label className={lbl}>
                    👤 Vehicle Owner Payment (TZS)
                    <span className="ml-2 text-purple-600 normal-case font-normal">· what you agreed with {booking.borrowed_owner_name || "the owner"}</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setPayoutType("fixed")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${
                        payoutType === "fixed" ? "bg-purple-600 text-white border-purple-600" : "bg-paper text-muted border-ink/15"
                      }`}>
                      Agreed amount
                    </button>
                    <button type="button" onClick={() => setPayoutType("percent")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${
                        payoutType === "percent" ? "bg-purple-600 text-white border-purple-600" : "bg-paper text-muted border-ink/15"
                      }`}>
                      Percentage
                    </button>
                  </div>
                  {payoutType === "fixed" ? (
                    <input type="number" value={payoutFixed} onChange={e => setPayoutFixed(e.target.value)} autoComplete="off" className={inp} placeholder="Amount in TZS" />
                  ) : (
                    <>
                      <input type="number" value={payoutPercent} onChange={e => setPayoutPercent(e.target.value)} autoComplete="off" className={inp} placeholder="e.g. 50" />
                      {ownerPayout > 0 && (
                        <p className="text-xs text-purple-700 mt-1.5">
                          = {ownerPayout.toLocaleString()} TZS of the {(parseFloat(tripAmount)||0).toLocaleString()} invoice
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="border border-ink/10 rounded-xl p-4 bg-paper-soft">
                <label className={lbl}>
                  🚨 Emergency Cost (TZS)
                  <span className="ml-2 text-muted normal-case font-normal">· only if something happened on the road</span>
                </label>
                <input type="number" value={emergencyCost} onChange={e => setEmergencyCost(e.target.value)}
                  autoComplete="off" className={inp} placeholder="Leave empty if no emergency" />
                {parseFloat(emergencyCost) > 0 && (
                  <div className="mt-2">
                    <label className={lbl}>What happened?</label>
                    <input value={emergencyNotes} onChange={e => setEmergencyNotes(e.target.value)}
                      autoComplete="off" className={inp} placeholder="Fine, breakdown, accident..." />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-4 border ${zuriNet >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-xs tracking-widest uppercase font-medium mb-3 text-muted">Zuri Net (this trip)</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted">Invoiced amount</span><span className="text-green-600 font-medium">+{(parseFloat(tripAmount)||0).toLocaleString()} TZS</span></div>
              <div className="flex justify-between"><span className="text-muted">⛽ Fuel</span><span className="text-red-500">-{(parseFloat(fuelCost)||0).toLocaleString()} TZS</span></div>
              {parseFloat(driverAllowance) > 0 && <div className="flex justify-between"><span className="text-muted">🧍 Allowance</span><span className="text-red-500">-{(parseFloat(driverAllowance)||0).toLocaleString()} TZS</span></div>}
              {isBorrowed && ownerPayout > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">👤 Vehicle owner{payoutType === "percent" ? ` (${payoutPercent}%)` : ""}</span>
                  <span className="text-red-500">-{ownerPayout.toLocaleString()} TZS</span>
                </div>
              )}
              {parseFloat(emergencyCost) > 0 && <div className="flex justify-between"><span className="text-muted">🚨 Emergency</span><span className="text-red-500">-{(parseFloat(emergencyCost)||0).toLocaleString()} TZS</span></div>}
              <div className="flex justify-between border-t border-ink/10 pt-2 mt-1">
                <span className="font-semibold">{zuriNet >= 0 ? "Net Profit" : "Net Loss"}</span>
                <span className={`font-bold text-base ${zuriNet >= 0 ? "text-green-600" : "text-red-600"}`}>{zuriNet >= 0 ? "+" : ""}{zuriNet.toLocaleString()} TZS</span>
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Trip Notes (optional)</label>
            <textarea value={tripNotes} onChange={e => setTripNotes(e.target.value)} rows={2}
              placeholder="Any notes about this trip..."
              className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold resize-none" />
          </div>

          <p className="text-xs text-muted">This just records the invoice you've already written outside the system. Waiting for payment is tracked automatically — you'll mark it paid separately once the customer settles.</p>
        </div>

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={saving || !invoiceNumber || !invoiceDate || !tripAmount || !fuelCost}
            className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
            {saving ? "Saving..." : "Save Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
  const sel = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold";
  const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";

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
            <span className="text-muted">Invoiced amount</span>
            <span className="font-semibold text-ink">{(parseFloat(booking.paid_amount)||0).toLocaleString()} TZS</span>
          </div>
          {parseFloat(booking.owner_payout_amount) > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm flex justify-between">
              <span className="text-purple-700">Owed to {booking.borrowed_owner_name || "vehicle owner"}</span>
              <span className="font-semibold text-purple-700">{parseFloat(booking.owner_payout_amount).toLocaleString()} TZS</span>
            </div>
          )}
          <div>
            <label className={lbl}>Payment Method</label>
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
          <p className="text-xs text-muted">This closes the job — the booking will move to Completed.</p>
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

function ViewBookingModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  const tripCost = parseFloat(booking.trip_cost) || 0;
  const ownerPayout = parseFloat(booking.owner_payout_amount) || 0;
  const paidAmount = parseFloat(booking.paid_amount) || 0;
  const tripProfit = paidAmount - tripCost - ownerPayout;
  const stage = getStage(booking);
  const daysOutstanding = (stage === "invoiced" || stage === "overdue") ? daysBetween(booking.invoice_date) : null;
  const isBorrowed = !!booking.is_borrowed_vehicle;

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
            {isBorrowed && (
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                <Users className="w-3 h-3" /> Borrowed vehicle
              </span>
            )}
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Customer</p>
            <p className="text-sm font-semibold text-ink">{booking.customer_name}</p>
            <p className="text-xs text-muted">{booking.customer_phone}</p>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Trip</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex gap-2"><span className="text-muted w-20">From:</span><span>{booking.pickup_location}, {booking.pickup_region}</span></div>
              <div className="flex gap-2"><span className="text-muted w-20">To:</span><span>{booking.dropoff_location}, {booking.dropoff_region}</span></div>
              <div className="flex gap-2"><span className="text-muted w-20">Date:</span><span>{booking.pickup_datetime ? new Date(booking.pickup_datetime).toLocaleString("en-TZ") : "—"}</span></div>
              <div className="flex gap-2"><span className="text-muted w-20">Vehicle:</span><span>{getVehicleLabel(booking)}</span></div>
              <div className="flex gap-2"><span className="text-muted w-20">Driver:</span><span>{booking.driver_name}</span></div>
              {booking.km_travelled && <div className="flex gap-2"><span className="text-muted w-20">Distance:</span><span>{parseFloat(booking.km_travelled).toLocaleString()} km</span></div>}
            </div>
          </div>

          {isBorrowed && (
            <div>
              <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Borrowed Vehicle</p>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted">Vehicle</span><span className="text-ink">{booking.borrowed_vehicle_desc || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Owner</span><span className="text-ink">{booking.borrowed_owner_name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Phone</span><span className="text-ink">{booking.borrowed_owner_phone || "—"}</span></div>
                {ownerPayout > 0 && (
                  <div className="flex justify-between border-t border-purple-200 pt-1.5 mt-1">
                    <span className="text-purple-700 font-medium">
                      Payout{booking.borrowed_payout_type === "percent" ? ` (${parseFloat(booking.borrowed_payout_percent || 0)}%)` : ""}
                    </span>
                    <span className="text-purple-700 font-semibold">{ownerPayout.toLocaleString()} TZS</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {booking.travel_details && (
            <div>
              <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Travel Details</p>
              <p className="text-sm text-ink bg-paper-soft rounded-xl p-3">{booking.travel_details}</p>
            </div>
          )}

          {booking.invoice_number && (
            <>
              <div>
                <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Zuri Net (this trip)</p>
                <div className={`rounded-xl p-4 border ${tripProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted">Invoiced amount</span><span className="text-green-600 font-medium">+{paidAmount.toLocaleString()} TZS</span></div>
                    <div className="flex justify-between"><span className="text-muted">Trip costs (fuel + allowance + emergency)</span><span className="text-red-500">-{tripCost.toLocaleString()} TZS</span></div>
                    {ownerPayout > 0 && (
                      <div className="flex justify-between"><span className="text-muted">👤 Vehicle owner</span><span className="text-red-500">-{ownerPayout.toLocaleString()} TZS</span></div>
                    )}
                    {parseFloat(booking.emergency_cost) > 0 && (
                      <div className="flex justify-between text-xs"><span className="text-muted">🚨 Emergency: {booking.emergency_notes}</span><span className="text-red-400">-{parseFloat(booking.emergency_cost).toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between border-t border-ink/10 pt-2 mt-1">
                      <span className="font-semibold">{tripProfit >= 0 ? "Net Profit" : "Net Loss"}</span>
                      <span className={`font-bold ${tripProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{tripProfit >= 0 ? "+" : ""}{tripProfit.toLocaleString()} TZS</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs tracking-widest uppercase text-gold font-medium mb-2">Payment</p>
                <div className="bg-paper-soft rounded-xl p-4 border border-ink/10 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted">Invoice number</span><span className="text-ink">{booking.invoice_number}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Invoice date</span><span className="text-ink">{new Date(booking.invoice_date).toLocaleDateString("en-TZ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Status</span><StageBadge booking={booking} /></div>
                  {stage === "completed" && (
                    <>
                      <div className="flex justify-between"><span className="text-muted">Paid via</span><span className="text-ink capitalize">{booking.payment_method?.replace("_"," ") || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Date received</span><span className="text-ink">{booking.payment_received_date ? new Date(booking.payment_received_date).toLocaleDateString("en-TZ") : "—"}</span></div>
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

function BookingForm({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [serviceType, setServiceType] = useState("car_hire");
  const [vehicleSource, setVehicleSource] = useState<"fleet" | "borrowed">("fleet");
  const [vehicleId, setVehicleId] = useState("");
  const [borrowedDesc, setBorrowedDesc] = useState("");
  const [borrowedOwnerName, setBorrowedOwnerName] = useState("");
  const [borrowedOwnerPhone, setBorrowedOwnerPhone] = useState("");
  const [driverId, setDriverId] = useState("");
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
    fetch("/api/admin/vehicles").then(r => r.json()).then(d => setVehicles(d.filter((v: any) => v.status === "available")));
    fetch("/api/admin/drivers").then(r => r.json()).then(d => setDrivers(d));
  }, []);

  const handlePickupRegion = (r: string) => { setPickupRegion(r); setPickupLocation(""); setPickupCustom(false); setPickupLocations(r ? getLocations(r) : []); };
  const handlePickupLocation = (l: string) => { if (l === "Other (specify below)") { setPickupCustom(true); setPickupLocation(""); } else { setPickupCustom(false); setPickupLocation(l); } };
  const handleDropRegion = (r: string) => { setDropRegion(r); setDropLocation(""); setDropCustom(false); setDropLocations(r ? getLocations(r) : []); };
  const handleDropLocation = (l: string) => { if (l === "Other (specify below)") { setDropCustom(true); setDropLocation(""); } else { setDropCustom(false); setDropLocation(l); } };

  const isBorrowed = vehicleSource === "borrowed";

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: customerName, customer_phone: customerPhone,
        customer_email: customerEmail, status: "confirmed",
        service_type: serviceType,
        vehicle_id: isBorrowed ? null : (vehicleId || null),
        is_borrowed_vehicle: isBorrowed,
        borrowed_vehicle_desc: isBorrowed ? borrowedDesc : null,
        borrowed_owner_name: isBorrowed ? borrowedOwnerName : null,
        borrowed_owner_phone: isBorrowed ? borrowedOwnerPhone : null,
        driver_id: driverId || null,
        pickup_region: pickupRegion, pickup_location: pickupCustom ? pickupCustomText : pickupLocation,
        dropoff_region: dropRegion, dropoff_location: dropCustom ? dropCustomText : dropLocation,
        pickup_datetime: pickupDatetime || null, dropoff_datetime: dropoffDatetime || null,
        travel_details: travelDetails || null, notes: notes || null,
      }),
    });
    setSaving(false);
    onSave();
  };

  const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
  const sel = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold";
  const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";
  const selectedVehicle = vehicles.find(v => v.id.toString() === vehicleId);

  const canSave = customerName && (isBorrowed ? borrowedDesc && borrowedOwnerName : true);

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <h2 className="font-display text-xl font-medium">New Booking</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Customer Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Customer Name *</label><input value={customerName} onChange={e => setCustomerName(e.target.value)} autoComplete="off" className={inp} /></div>
              <div><label className={lbl}>Phone</label><input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} autoComplete="off" className={inp} /></div>
              <div className="sm:col-span-2"><label className={lbl}>Email</label><input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} autoComplete="off" className={inp} /></div>
            </div>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Service & Assignment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Service Type</label>
                <select value={serviceType} onChange={e => setServiceType(e.target.value)} className={sel}>
                  {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Driver</label>
                <select value={driverId} onChange={e => setDriverId(e.target.value)} className={sel}>
                  <option value="">— Select Driver —</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={lbl}>Vehicle</label>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setVehicleSource("fleet")}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      !isBorrowed ? "bg-ink text-paper border-ink" : "bg-paper text-muted border-ink/15 hover:border-ink/30"
                    }`}>
                    From my fleet
                  </button>
                  <button type="button" onClick={() => setVehicleSource("borrowed")}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      isBorrowed ? "bg-purple-600 text-white border-purple-600" : "bg-paper text-muted border-ink/15 hover:border-ink/30"
                    }`}>
                    Borrowed for this job
                  </button>
                </div>

                {!isBorrowed ? (
                  <>
                    <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={sel}>
                      <option value="">— Select Vehicle —</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.seats} seats){v.plate_number ? ` · ${v.plate_number}` : ""}</option>)}
                    </select>
                    {selectedVehicle && <p className="text-xs text-gold mt-1">✓ {selectedVehicle.seats} seats available</p>}
                  </>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-purple-700">
                      Just for this job — nothing is added to your fleet, and no documents are tracked. What you pay the owner is entered later, with the invoice.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className={lbl}>Vehicle *</label>
                        <input value={borrowedDesc} onChange={e => setBorrowedDesc(e.target.value)} autoComplete="off" className={inp} placeholder="e.g. Toyota Coaster 26-seat" />
                      </div>
                      <div>
                        <label className={lbl}>Owner Name *</label>
                        <input value={borrowedOwnerName} onChange={e => setBorrowedOwnerName(e.target.value)} autoComplete="off" className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Owner Phone</label>
                        <input value={borrowedOwnerPhone} onChange={e => setBorrowedOwnerPhone(e.target.value)} autoComplete="off" className={inp} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs tracking-widest uppercase text-gold font-medium mb-3">Trip Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Pickup Region</label>
                <select value={pickupRegion} onChange={e => handlePickupRegion(e.target.value)} className={sel}>
                  <option value="">— Select Region —</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Pickup Location</label>
                {!pickupRegion ? (
                  <input disabled placeholder="Select a region first" className="w-full border border-ink/15 bg-paper-soft text-muted px-3 py-2.5 rounded-lg text-sm cursor-not-allowed" />
                ) : (
                  <select value={pickupCustom ? "Other (specify below)" : pickupLocation} onChange={e => handlePickupLocation(e.target.value)} className={sel}>
                    <option value="">— Select Location —</option>
                    {pickupLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
              </div>
              {pickupCustom && (
                <div className="sm:col-span-2"><label className={lbl}>Specify Pickup Location</label>
                  <input value={pickupCustomText} onChange={e => setPickupCustomText(e.target.value)} autoFocus autoComplete="off" className={`${inp} border-gold/50`} />
                </div>
              )}
              <div><label className={lbl}>Drop Region</label>
                <select value={dropRegion} onChange={e => handleDropRegion(e.target.value)} className={sel}>
                  <option value="">— Select Region —</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Drop Location</label>
                {!dropRegion ? (
                  <input disabled placeholder="Select a region first" className="w-full border border-ink/15 bg-paper-soft text-muted px-3 py-2.5 rounded-lg text-sm cursor-not-allowed" />
                ) : (
                  <select value={dropCustom ? "Other (specify below)" : dropLocation} onChange={e => handleDropLocation(e.target.value)} className={sel}>
                    <option value="">— Select Location —</option>
                    {dropLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
              </div>
              {dropCustom && (
                <div className="sm:col-span-2"><label className={lbl}>Specify Drop Location</label>
                  <input value={dropCustomText} onChange={e => setDropCustomText(e.target.value)} autoFocus autoComplete="off" className={`${inp} border-gold/50`} />
                </div>
              )}
              <div><label className={lbl}>Pickup Date & Time</label><input type="datetime-local" value={pickupDatetime} onChange={e => setPickupDatetime(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Drop Date & Time (estimate)</label><input type="datetime-local" value={dropoffDatetime} onChange={e => setDropoffDatetime(e.target.value)} className={inp} /></div>
              <div className="sm:col-span-2"><label className={lbl}>Travel Details</label>
                <textarea value={travelDetails} onChange={e => setTravelDetails(e.target.value)} rows={3}
                  placeholder="Group size, luggage, special requirements..."
                  className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold resize-none" />
              </div>
              <div className="sm:col-span-2"><label className={lbl}>Internal Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold resize-none" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            💡 Booking starts as <strong>Confirmed</strong>. When the car returns and you've written the invoice, click <strong>Record Invoice</strong> to enter it here. It stays open until you <strong>Mark as Paid</strong>.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState<any>(null);
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [viewBooking, setViewBooking] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | Stage>("all");

  const fetchBookings = useCallback(async () => {
    const res = await fetch("/api/admin/bookings");
    const data = await res.json();
    setBookings(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const deleteBooking = async (id: number, ref: string) => {
    if (!confirm(`Delete booking ${ref}? This will also remove all linked expenses. This cannot be undone.`)) return;
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
          <div className="text-xs tracking-widest uppercase text-green-700 mb-1">Total Revenue</div>
          <div className="font-display text-2xl font-medium text-green-700">{totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-green-600 mt-0.5">TZS · invoiced trips</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="text-xs tracking-widest uppercase text-red-700 mb-1">Trip Direct Costs</div>
          <div className="font-display text-2xl font-medium text-red-600">{totalTripCost.toLocaleString()}</div>
          <div className="text-xs text-red-500 mt-0.5">TZS · fuel + allowance + emergency + borrowed payouts</div>
        </div>
        <div className={`border rounded-2xl p-4 ${totalProfit >= 0 ? "bg-gold/10 border-gold/30" : "bg-red-100 border-red-300"}`}>
          <div className={`text-xs tracking-widest uppercase mb-1 ${totalProfit >= 0 ? "text-gold" : "text-red-700"}`}>Net from Trips</div>
          <div className={`font-display text-2xl font-medium ${totalProfit >= 0 ? "text-gold" : "text-red-700"}`}>{totalProfit.toLocaleString()}</div>
          <div className={`text-xs mt-0.5 ${totalProfit >= 0 ? "text-gold" : "text-red-600"}`}>TZS · before monthly & periodic costs</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="text-xs tracking-widest uppercase text-amber-700 mb-1">Outstanding</div>
          <div className="font-display text-2xl font-medium text-amber-700">{outstanding.toLocaleString()}</div>
          <div className="text-xs text-amber-600 mt-0.5">TZS · {outstandingBookings.length} not yet paid</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" placeholder="Search by ref, customer or location..."
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
          <button onClick={() => setShowForm(true)} className="mt-3 text-gold text-sm hover:underline">Create first booking →</button>
        </div>
      ) : (
        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/10 bg-paper-soft">
                  {["Ref","Customer","Service","Route","Vehicle","Driver","Date","Revenue","Zuri Net","Stage","Actions"].map(h => (
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
                        {getVehicleLabel(b)}
                        {b.is_borrowed_vehicle && (
                          <span className="ml-1.5 text-[0.6rem] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">Borrowed</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-soft whitespace-nowrap">{b.driver_name || "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted whitespace-nowrap">
                        {b.pickup_datetime ? new Date(b.pickup_datetime).toLocaleDateString("en-TZ",{day:"numeric",month:"short",year:"2-digit"}) : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {invoiced ? <span className="text-green-600 font-semibold">+{paid.toLocaleString()}</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {invoiced ? (
                          <span className={`font-semibold ${profit >= 0 ? "text-gold" : "text-red-500"}`}>{profit >= 0 ? "+" : ""}{profit.toLocaleString()}</span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-3"><StageBadge booking={b} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewBooking(b)} title="View details"
                            className="p-1.5 text-muted hover:text-ink hover:bg-ink/5 rounded-lg transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {stage === "confirmed" && (
                            <button onClick={() => setInvoiceBooking(b)} title="Record invoice & costs"
                              className="p-1.5 text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(stage === "invoiced" || stage === "overdue") && (
                            <>
                              <button onClick={() => setInvoiceBooking(b)} title="Edit invoice"
                                className="p-1.5 text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setPaymentBooking(b)} title="Mark as paid"
                                className="p-1.5 text-muted hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <Banknote className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {stage === "confirmed" && (
                            <button onClick={() => { if(confirm("Cancel this booking?")) cancelBooking(b.id); }} title="Cancel booking"
                              className="p-1.5 text-muted hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteBooking(b.id, b.booking_ref)} title="Delete booking"
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
    </div>
  );
}

