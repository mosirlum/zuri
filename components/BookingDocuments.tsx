"use client";

import { useState, useRef } from "react";
import { Plus, X, FileText, Truck, Printer, Save } from "lucide-react";
import { invoiceConfig as cfg, amountInWords } from "@/lib/invoice-config";

type LineItem = {
  description: string;
  start_date: string;
  end_date: string;
  days: string;
  service_type: string;
  destination_area: string;
  base_km: string;
  unit_cost: string;
  extra_qty: string;
  extra_cost: string;
  total: string;
};

const emptyItem = (): LineItem => ({
  description: "", start_date: "", end_date: "", days: "1",
  service_type: "Travel", destination_area: "",
  base_km: "First 100", unit_cost: "", extra_qty: "N/A", extra_cost: "N/A", total: "",
});

const num = (v: any) => parseFloat(String(v ?? "").replace(/,/g, "")) || 0;
const money = (v: any) => num(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dmy = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
};

const longDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const day = dt.getDate();
  const sfx = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${sfx} ${dt.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
};

// Commits on blur rather than on every keystroke, so the field is never
// rebuilt mid-word and the caret stays where it was put.
function Ed({ value, onChange, placeholder, block }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  block?: boolean;
}) {
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-ph={placeholder || ""}
      onBlur={e => onChange(e.currentTarget.textContent || "")}
      className={`zed ${block ? "zed-block" : ""}`}
      dangerouslySetInnerHTML={{ __html: value || "" }}
    />
  );
}

export default function BookingDocuments({ booking, onClose, onSaved }: {
  booking: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const saved = booking.document_data || {};
  const vehicles = booking.vehicles || [];
  const sheetRef = useRef<HTMLDivElement>(null);

  const platesAuto = vehicles
    .map((v: any) => v.plate_number || (v.is_borrowed ? v.borrowed_vehicle_desc : ""))
    .filter(Boolean).join("  ");
  const driversAuto = vehicles.map((v: any) => v.driver_name).filter(Boolean).join(" ");
  const count = vehicles.length;
  const countWord = count > 1 ? `${count} (${count})` : "One (1)";

  const [mode, setMode] = useState<"dn" | "inv">("inv");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const [f, setF] = useState({
    deliveryRef: saved.deliveryRef || "",
    invoiceRef: saved.invoiceRef || "",
    taxInvoiceNo: saved.taxInvoiceNo || booking.invoice_number || "",
    proformaNo: saved.proformaNo || "",
    orderNo: saved.orderNo || "",
    orderDate: saved.orderDate || "",
    recipientTitle: saved.recipientTitle || "Rector,",
    recipientOrg: saved.recipientOrg || booking.customer_name || "",
    recipientPobox: saved.recipientPobox || "",
    recipientCity: saved.recipientCity || "Dar es Salaam",
    vehicleDesc: saved.vehicleDesc || "Fully Air-Conditioned Mini Bus",
    passengers: saved.passengers || "Twenty-Five (25)",
    startTime: saved.startTime || "06:00",
    endTime: saved.endTime || "23:30",
    baseKm: saved.baseKm || "100",
    unitCost: saved.unitCost || "",
    extraKmRate: saved.extraKmRate || "2,000",
    details: saved.details || "",
    efdReceipt: saved.efdReceipt || "",
    footerArea: saved.footerArea || "",
    plates: saved.plates || platesAuto,
    drivers: saved.drivers || driversAuto,
    deliveryDate: saved.deliveryDate || booking.invoice_date?.split("T")[0] || "",
    invoiceDate: saved.invoiceDate || booking.invoice_date?.split("T")[0] || "",
  });

  const [items, setItems] = useState<LineItem[]>(
    saved.items?.length ? saved.items : [{
      ...emptyItem(),
      description: [booking.pickup_location, booking.dropoff_location].filter(Boolean).join(" - "),
      destination_area: booking.dropoff_region || "",
      start_date: booking.pickup_datetime?.split("T")[0] || "",
      end_date: booking.dropoff_datetime?.split("T")[0] || booking.pickup_datetime?.split("T")[0] || "",
    }]
  );

  const set = (k: string, v: string) => { setF(p => ({ ...p, [k]: v })); setSavedOk(false); };
  const setItem = (i: number, patch: Partial<LineItem>) => {
    setItems(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
    setSavedOk(false);
  };
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const grandTotal = items.reduce((s, r) => s + num(r.total), 0);
  const firstDate = items[0]?.start_date;
  const lastDate = items[items.length - 1]?.end_date || firstDate;

  const save = async () => {
    setSaving(true);
    await fetch("/api/admin/bookings/documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, document_data: { ...f, items } }),
    });
    setSaving(false);
    setSavedOk(true);
    onSaved();
  };

  // Prints exactly what's on screen — the sheet is lifted into a clean window
  // so browser headers and the surrounding app don't come along.
  const print = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${mode === "dn" ? "Delivery Note" : "Tax Invoice"} — ${booking.booking_ref}</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:"Times New Roman",Georgia,serif; color:#000; font-size:11pt; line-height:1.35;
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .zed { outline:none; }
  .zed:empty:before { content:""; }
  .rowdel, .addrow, .noprint { display:none !important; }
  table { width:100%; border-collapse:collapse; font-size:8.5pt; margin-top:8px; }
  th, td { border:1px solid #000; padding:3px 4px; vertical-align:top; }
  th { text-align:center; font-weight:bold; }
  .c { text-align:center; } .r { text-align:right; }
  .co { text-align:center; }
  .co h1 { font-size:20pt; letter-spacing:0.5px; font-weight:bold; }
  .co .tag, .co .contact { font-size:8pt; font-style:italic; }
  .band { display:flex; justify-content:space-between; margin-top:10px; }
  .addr { text-align:right; font-size:10pt; }
  .doctitle { text-align:right; font-weight:bold; text-decoration:underline; font-size:11pt; }
  .center-title { text-align:center; font-weight:bold; text-decoration:underline; font-size:12pt; margin:10px 0; }
  .to, .svc { font-size:10pt; }
  .to { margin-top:6px; } .svc { margin-top:10px; }
  .svc .h { font-style:italic; } .svc .l { margin-left:16px; }
  .vdet { font-size:9pt; font-style:italic; font-weight:bold; margin-top:12px; }
  .note { font-size:8.5pt; font-style:italic; margin-top:3px; }
  .gt { text-align:right; font-weight:bold; font-size:10.5pt; margin-top:10px; }
  .words { font-size:10pt; font-style:italic; font-weight:bold; margin-top:10px; }
  .efd { font-size:10pt; font-weight:bold; margin-top:10px; }
  .pay { display:flex; justify-content:space-between; margin-top:14px; font-size:10pt; }
  .sign { margin-top:22px; font-size:10pt; }
  .slogan { text-align:center; font-style:italic; font-weight:bold; font-size:13pt; margin-top:14px; }
  .conf { margin-top:16px; font-size:10pt; }
  .conf .crow { margin-top:12px; }
  .dots { display:inline-block; border-bottom:1px dotted #000; min-width:150px; }
</style></head><body>${sheet.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const isDN = mode === "dn";

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-start justify-center p-4 overflow-y-auto">
      <style>{`
        .zed { outline:none; background:#fef9e7; border-bottom:1px dotted #b8843a; padding:0 2px; min-width:28px; display:inline-block; }
        .zed:focus { background:#fff3cd; }
        .zed:empty:before { content:attr(data-ph); color:#b0a89c; font-style:italic; }
        .zed-block { display:block; width:100%; }
      `}</style>

      <div className="bg-paper rounded-2xl w-full max-w-4xl my-4">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between gap-3 flex-wrap sticky top-0 bg-paper z-10 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="font-display text-xl font-medium">Documents</h2>
              <p className="text-xs text-gold font-mono mt-0.5">{booking.booking_ref}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMode("dn")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${isDN ? "bg-ink text-paper border-ink" : "bg-paper text-muted border-ink/15"}`}>
                <Truck className="w-3.5 h-3.5" /> Delivery Note
              </button>
              <button onClick={() => setMode("inv")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${!isDN ? "bg-gold text-ink border-gold" : "bg-paper text-muted border-ink/15"}`}>
                <FileText className="w-3.5 h-3.5" /> Tax Invoice
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-ink/15 rounded-xl font-medium hover:border-gold disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? "Saving" : savedOk ? "Saved" : "Save"}
            </button>
            <button onClick={print}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose} className="text-muted hover:text-ink text-xl px-2">✕</button>
          </div>
        </div>

        <div className="px-6 py-3 bg-paper-soft border-b border-ink/10 text-xs text-muted">
          Tap any highlighted field to edit it
        </div>

        <div className="p-6 bg-ink/5">
          <div ref={sheetRef} className="bg-white text-black p-10 mx-auto shadow-sm"
            style={{ fontFamily: '"Times New Roman", Georgia, serif', fontSize: "11pt", lineHeight: 1.35, maxWidth: "820px" }}>

            <div className="co" style={{ textAlign: "center", color: cfg.brandColor }}>
              <h1 style={{ fontSize: "20pt", fontWeight: "bold", letterSpacing: "0.5px" }}>{cfg.companyName}</h1>
              <div className="tag" style={{ fontSize: "8pt", fontStyle: "italic" }}>{cfg.tagline}</div>
              <div className="contact" style={{ fontSize: "8pt", fontStyle: "italic" }}>
                Email: {cfg.email}  Tel: {cfg.phones}
              </div>
            </div>

            <div className="band" style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <div><b>TIN No: {cfg.tin}</b></div>
              <div style={{ textAlign: "right" }}>
                {isDN && <div className="doctitle" style={{ fontWeight: "bold", textDecoration: "underline", fontSize: "11pt", color: cfg.brandColor }}>DELIVERY NOTE ORIGINAL</div>}
                <div className="addr" style={{ fontSize: "10pt" }}>
                  {cfg.address.line1}<br />{cfg.address.line2}<br />{cfg.address.line3},<br />
                  <b>{cfg.address.city}.</b>
                </div>
              </div>
            </div>

            <div className="band" style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10pt" }}>
              <div>Ref No <Ed value={isDN ? f.deliveryRef : f.invoiceRef} placeholder={isDN ? "ZT/DN/72/72/0180" : "ZT/AB/T172/72/0174"} onChange={v => set(isDN ? "deliveryRef" : "invoiceRef", v)} /></div>
              <div><b>{longDate(isDN ? f.deliveryDate : f.invoiceDate) || "—"}</b></div>
            </div>

            <div className="band" style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="to" style={{ fontSize: "10pt", marginTop: "6px" }}>
                <Ed value={f.recipientTitle} placeholder="Rector," onChange={v => set("recipientTitle", v)} /><br />
                <Ed value={f.recipientOrg} placeholder="National Institute of Transport" onChange={v => set("recipientOrg", v)} />,<br />
                <Ed value={f.recipientPobox} placeholder="P. O. Box 705" onChange={v => set("recipientPobox", v)} />,<br />
                <b><Ed value={f.recipientCity} placeholder="Dar es Salaam" onChange={v => set("recipientCity", v)} /></b>
              </div>
              {!isDN && (
                <div style={{ textAlign: "right", fontSize: "10pt", fontStyle: "italic", marginTop: "6px" }}>
                  <b>Tax Invoice No: <Ed value={f.taxInvoiceNo} placeholder="ZTCH/VHTI3/0174" onChange={v => set("taxInvoiceNo", v)} /></b>
                </div>
              )}
            </div>

            {!isDN && (
              <>
                <div style={{ marginTop: "12px", fontSize: "10pt" }}>Dear Sir,</div>
                <div className="center-title" style={{ textAlign: "center", fontWeight: "bold", textDecoration: "underline", fontSize: "12pt", margin: "10px 0" }}>Re: TAX INVOICE</div>
              </>
            )}

            <div className="svc" style={{ fontSize: "10pt", marginTop: "10px" }}>
              <div className="h" style={{ fontStyle: "italic" }}>{isDN ? "Services to be rendered" : "Services Rendered"}</div>
              <div className="l" style={{ marginLeft: "16px" }}>
                {countWord} <Ed value={f.vehicleDesc} placeholder="Fully Air-Conditioned Mini Bus" onChange={v => set("vehicleDesc", v)} /> with Fuel and Driver
              </div>
              <div className="l" style={{ marginLeft: "16px" }}>
                Number of Passengers: Not more than <Ed value={f.passengers} placeholder="Twenty-Five (25)" onChange={v => set("passengers", v)} />
              </div>
              {!isDN && (
                <>
                  <div className="l" style={{ marginLeft: "16px" }}>
                    Price: Travel cost is Tshs <Ed value={f.unitCost} placeholder="350,000" onChange={v => set("unitCost", v)} /> for the first <Ed value={f.baseKm} placeholder="100" onChange={v => set("baseKm", v)} /> Kilometers
                  </div>
                  <div className="l" style={{ marginLeft: "48px" }}>
                    Any extra Kilometer will be Charged Tshs <Ed value={f.extraKmRate} placeholder="2,000" onChange={v => set("extraKmRate", v)} /> per Kilometer
                  </div>
                </>
              )}
              <div className="l" style={{ marginLeft: "16px" }}>
                Trip Dates: Commencement Date: {longDate(firstDate) || "—"}, End Date {longDate(lastDate) || "—"}.
              </div>
              <div className="l" style={{ marginLeft: "16px" }}>
                Service Time: Start Time <Ed value={f.startTime} placeholder="06:00" onChange={v => set("startTime", v)} /> Hrs. End Time <Ed value={f.endTime} placeholder="23:30" onChange={v => set("endTime", v)} /> Hrs.
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", marginTop: "8px" }}>
              <thead>
                <tr>
                  {["Order No", "Order Date", "Invoice Date", "Details", "Driver", "Proforma Invoice No"].map(h => (
                    <th key={h} style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center", fontWeight: "bold" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="c" style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}>
                    <Ed value={f.orderNo} placeholder="0014/2026" onChange={v => set("orderNo", v)} />
                  </td>
                  <td className="c" style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}>{dmy(f.orderDate) || <Ed value="" placeholder="dd/mm/yyyy" onChange={() => {}} />}</td>
                  <td className="c" style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}>{dmy(isDN ? f.deliveryDate : f.invoiceDate)}</td>
                  <td style={{ border: "1px solid #000", padding: "3px 4px" }}>
                    <Ed block value={f.details} placeholder="One (1) Vehicle Hire for Transport Services..." onChange={v => set("details", v)} />
                  </td>
                  <td className="c" style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}>
                    <Ed value={f.drivers} placeholder="Driver" onChange={v => set("drivers", v)} />
                  </td>
                  <td className="c" style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}>
                    <Ed value={f.proformaNo} placeholder="ZT/VHI3/0174" onChange={v => set("proformaNo", v)} />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="vdet" style={{ fontSize: "9pt", fontStyle: "italic", fontWeight: "bold", marginTop: "12px" }}>
              Vehicles Details: <Ed value={f.vehicleDesc} onChange={v => set("vehicleDesc", v)} /> Registration No <Ed value={f.plates} placeholder="T444DUN" onChange={v => set("plates", v)} />
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", marginTop: "8px" }}>
              <thead>
                <tr>
                  {(isDN
                    ? ["S/No", "Description and Area", "Start Date", "End Date", "Days", "Type of Service", "Destination Area"]
                    : ["S/N", "Description/ Area", "Dates", "Base Km", "Unit Cost Tshs", "Extra Km Or Days", "Extra Km Cost", "Total Costs Tshs"]
                  ).map(h => (
                    <th key={h} style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center", fontWeight: "bold" }}>{h}</th>
                  ))}
                  <th className="rowdel" style={{ border: "none", width: "24px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => {
                  const td = { border: "1px solid #000", padding: "3px 4px" } as const;
                  return (
                    <tr key={i}>
                      <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
                      <td style={td}><Ed block value={r.description} placeholder="Dar - Kibaha - Dar" onChange={v => setItem(i, { description: v })} /></td>
                      {isDN ? (
                        <>
                          <td style={{ ...td, textAlign: "center" }}>{longDate(r.start_date)}</td>
                          <td style={{ ...td, textAlign: "center" }}>{longDate(r.end_date)}</td>
                          <td style={{ ...td, textAlign: "center" }}><Ed value={r.days} onChange={v => setItem(i, { days: v })} /></td>
                          <td style={{ ...td, textAlign: "center" }}><Ed value={r.service_type} placeholder="Travel" onChange={v => setItem(i, { service_type: v })} /></td>
                          <td style={{ ...td, textAlign: "center" }}><Ed value={r.destination_area} placeholder="Area" onChange={v => setItem(i, { destination_area: v })} /></td>
                        </>
                      ) : (
                        <>
                          <td style={{ ...td, textAlign: "center" }}>{dmy(r.start_date)}{r.end_date && r.end_date !== r.start_date ? ` - ${dmy(r.end_date)}` : ""}</td>
                          <td style={{ ...td, textAlign: "center" }}><Ed value={r.base_km} onChange={v => setItem(i, { base_km: v })} /></td>
                          <td style={{ ...td, textAlign: "right" }}><Ed value={r.unit_cost} placeholder="350,000" onChange={v => setItem(i, { unit_cost: v })} /></td>
                          <td style={{ ...td, textAlign: "center" }}><Ed value={r.extra_qty} onChange={v => setItem(i, { extra_qty: v })} /></td>
                          <td style={{ ...td, textAlign: "center" }}><Ed value={r.extra_cost} onChange={v => setItem(i, { extra_cost: v })} /></td>
                          <td style={{ ...td, textAlign: "right" }}><Ed value={r.total} placeholder="0" onChange={v => setItem(i, { total: v })} /></td>
                        </>
                      )}
                      <td className="rowdel" style={{ border: "none", textAlign: "center" }}>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700" title="Remove row">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!isDN && (
                  <>
                    <tr>
                      <td colSpan={3} style={{ border: "1px solid #000", padding: "3px 4px" }}></td>
                      <td style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}><b>{count} Vehicle{count === 1 ? "" : "s"}</b></td>
                      <td style={{ border: "1px solid #000", padding: "3px 4px" }}></td>
                      <td style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}><b>Total</b></td>
                      <td style={{ border: "1px solid #000", padding: "3px 4px" }}></td>
                      <td style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "right" }}><b>{money(grandTotal)}</b></td>
                      <td className="rowdel" style={{ border: "none" }}></td>
                    </tr>
                    <tr>
                      <td colSpan={5} style={{ border: "1px solid #000", padding: "3px 4px" }}></td>
                      <td style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}><b>Grand</b></td>
                      <td style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}><b>Total</b></td>
                      <td style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "right" }}><b>{money(grandTotal)}</b></td>
                      <td className="rowdel" style={{ border: "none" }}></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            <div className="addrow" style={{ marginTop: "6px" }}>
              <button onClick={addItem}
                className="flex items-center gap-1 text-xs text-gold hover:underline">
                <Plus className="w-3 h-3" /> Add row
              </button>
            </div>

            <div className="note" style={{ fontSize: "8.5pt", fontStyle: "italic", marginTop: "3px" }}>
              <Ed value={f.footerArea} placeholder="Dar (NIT)-Kibaha Coast Region" onChange={v => set("footerArea", v)} />
            </div>

            {isDN ? (
              <div className="conf" style={{ marginTop: "16px", fontSize: "10pt" }}>
                <b>Confirmation of Service Delivery</b>
                <div className="crow" style={{ marginTop: "12px" }}>
                  Service Dates: <span className="dots" style={{ display: "inline-block", borderBottom: "1px dotted #000", minWidth: "150px" }}></span>
                  &nbsp;&nbsp; Customer Name: <span className="dots" style={{ display: "inline-block", borderBottom: "1px dotted #000", minWidth: "150px" }}></span>
                </div>
                <div className="crow" style={{ marginTop: "12px" }}>
                  Driver&apos;s Signature: <span className="dots" style={{ display: "inline-block", borderBottom: "1px dotted #000", minWidth: "150px" }}></span>
                  &nbsp;&nbsp; Customer Signature: <span className="dots" style={{ display: "inline-block", borderBottom: "1px dotted #000", minWidth: "150px" }}></span>
                </div>
                <div className="crow" style={{ marginTop: "12px" }}><b>{cfg.signOff}</b></div>
              </div>
            ) : (
              <>
                <div className="gt" style={{ textAlign: "right", fontWeight: "bold", fontSize: "10.5pt", marginTop: "10px" }}>
                  Grand Total Tshs: {money(grandTotal)}
                </div>
                <div className="words" style={{ fontSize: "10pt", fontStyle: "italic", fontWeight: "bold", marginTop: "10px" }}>
                  Amount in Words Shillings: {amountInWords(grandTotal)}
                </div>
                <div className="efd" style={{ fontSize: "10pt", fontWeight: "bold", marginTop: "10px" }}>
                  EFD Receipt No <Ed value={f.efdReceipt} placeholder="04627C159" onChange={v => set("efdReceipt", v)} /> of Tshs {money(grandTotal)} Attached herewith
                </div>
                <div className="pay" style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", fontSize: "10pt" }}>
                  <div><b>Please Pay: Account Details:</b></div>
                  <div>
                    Account Name: &nbsp;{cfg.bank.accountName}<br />
                    Account Number: {cfg.bank.accountNumber}<br />
                    Bank/ Branch: &nbsp;&nbsp;{cfg.bank.branch}<br />
                    Place/Region: &nbsp;&nbsp;{cfg.bank.place}
                  </div>
                </div>
                <div className="sign" style={{ marginTop: "22px", fontSize: "10pt" }}><b>{cfg.signOff}</b></div>
              </>
            )}

            <div className="slogan" style={{ textAlign: "center", fontStyle: "italic", fontWeight: "bold", fontSize: "13pt", marginTop: "14px", color: cfg.brandColor }}>
              {cfg.slogan}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
