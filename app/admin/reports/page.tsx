"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, Lock, TrendingUp, TrendingDown, Car, Building2, CalendarCheck, Download, FileText, DollarSign, AlertTriangle, Clock, Minus, Calendar, Info, ArrowRight, Receipt } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { isVehicleCost } from "@/lib/money-rules";
import WrittenAnalysis from "@/components/WrittenAnalysis";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const EXPENSE_CATEGORIES: Record<string, string> = {
  fuel: "Fuel", maintenance: "Maintenance", driver_salary: "Driver Salary",
  insurance_premium: "Insurance Premium", license_renewal: "License Renewal",
  road_worthiness: "Road Worthiness", office_maintenance: "Office Maintenance",
  office_security: "Office Security", office_electricity: "Office Electricity (Umeme)",
  office_water: "Office Water (Maji)", office_stationery: "Office Stationery",
  office_rent: "Office Rent (Kodi ya Jengo)", vat_service_levy: "VAT / Service Levy",
  marketing: "Marketing", tax: "Tax", other: "Other",
};

const SERVICE_LABELS: Record<string, string> = {
  car_hire: "Car Hire", port_shuttle: "Port Shuttle",
  executive_transport: "Executive Transport", group_transportation: "Group Transportation",
  vip_wedding: "VIP & Wedding", tours_safari: "Tours & Safari", other: "Other",
};

type FilterMode = "week" | "month" | "year" | "all";

const isInvoiced = (b: any) => !!b.invoice_number;
const tripCostOf = (b: any) => (parseFloat(b.trip_cost) || 0) + (parseFloat(b.owner_payout_amount) || 0);



// Pulls the same four headline numbers out of any period's payload, so the
// current and previous periods can be measured the same way.
function metricsOf(payload: any) {
  const expenses = payload?.expenses || [];
  const revenue = payload?.summary?.totalRevenue || 0;
  const vehicleCosts = expenses.filter(isVehicleCost).reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const companyCosts = expenses.filter((e: any) => !isVehicleCost(e)).reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  return { revenue, vehicleCosts, companyCosts, net: revenue - vehicleCosts - companyCosts };
}

// The period immediately before the one being viewed. "All time" has none.
function previousPeriod(mode: string, year: number, month: number, week: number) {
  if (mode === "all") return null;
  if (mode === "year") return { type: "year", year: year - 1, month, week, label: `${year - 1}` };
  if (mode === "month") {
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    return { type: "month", year: y, month: m, week, label: `${MONTHS[m]} ${y}` };
  }
  if (mode === "week") {
    const w = week === 1 ? 52 : week - 1;
    const y = week === 1 ? year - 1 : year;
    return { type: "week", year: y, month, week: w, label: `Week ${w}` };
  }
  return null;
}

// Green means the number moved in the direction the business wants — up for
// revenue and profit, down for costs.
function Delta({ current, previous, label, lowerIsBetter = false }: {
  current: number; previous: number; label: string; lowerIsBetter?: boolean;
}) {
  if (!previous) return null;
  const diff = current - previous;
  const pct = Math.round((diff / Math.abs(previous)) * 100);
  if (pct === 0) {
    return (
      <div className="flex items-center gap-1 text-[0.7rem] text-muted mt-1.5">
        <Minus className="w-3 h-3" /> same as {label}
      </div>
    );
  }
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <div className={`flex items-center gap-1 text-[0.7rem] mt-1.5 font-medium ${good ? "text-green-600" : "text-red-500"}`}>
      <Icon className="w-3 h-3" />
      {pct > 0 ? "+" : ""}{pct}% <span className="text-muted font-normal">vs {label}</span>
    </div>
  );
}

const compact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
};

// Rounds an axis out to a clean 1 / 2 / 5 step so the labels read as money.
function niceStep(rough: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const norm = (rough || 1) / pow;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * pow;
}

// A thumbnail of the same series shown in the big chart — enough to see the
// direction without reading a number.
function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const spanV = (max - min) || 1;
  const W = 100, H = 28;
  const d = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / spanV) * H;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3" style={{ height: "28px" }} preserveAspectRatio="none">
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [data, setData] = useState<any>(null);
  const [prevData, setPrevData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedWeek, setSelectedWeek] = useState(1);

  const years = [2024, 2025, 2026, 2027];

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      type: filterMode,
      year: selectedYear.toString(),
      month: selectedMonth.toString(),
      week: selectedWeek.toString(),
    });
    const prev = previousPeriod(filterMode, selectedYear, selectedMonth, selectedWeek);
    const prevParams = prev && new URLSearchParams({
      type: prev.type, year: prev.year.toString(),
      month: prev.month.toString(), week: prev.week.toString(),
    });

    const [res, prevRes] = await Promise.all([
      fetch(`/api/admin/reports?${params}`),
      prevParams ? fetch(`/api/admin/reports?${prevParams}`) : Promise.resolve(null),
    ]);

    setData(await res.json());
    setPrevData(prevRes ? await prevRes.json() : null);
    setLoading(false);
  }, [filterMode, selectedYear, selectedMonth, selectedWeek]);

  useEffect(() => {
    if (role === "super_admin") fetchReport();
  }, [role, fetchReport]);

  const summary = data?.summary;
  const bookings = data?.bookings || [];
  const expenses = data?.expenses || [];
  const vehicles = data?.vehicles || [];
  const bookingVehicles = data?.bookingVehicles || [];

  // ── Two-layer P&L ──────────────────────────────────────────────
  const vehicleCosts = expenses.filter(isVehicleCost).reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const companyCosts = expenses.filter((e: any) => !isVehicleCost(e)).reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const revenue = summary?.totalRevenue || 0;
  const grossFromOperations = revenue - vehicleCosts;
  const netProfit = grossFromOperations - companyCosts;

  const prev = previousPeriod(filterMode, selectedYear, selectedMonth, selectedWeek);
  const prevM = prevData ? metricsOf(prevData) : null;

  const invoicedTrips = bookings.filter(isInvoiced);
  const avgPerTrip = invoicedTrips.length > 0 ? revenue / invoicedTrips.length : 0;
  const overheadRatio = revenue > 0 ? (companyCosts / revenue) * 100 : 0;

  const unpaid = bookings.filter((b: any) => isInvoiced(b) && b.payment_status !== "paid");
  const outstandingAmount = unpaid.reduce((s: number, b: any) => s + parseFloat(b.paid_amount || 0), 0);

  // ── Per-vehicle performance ────────────────────────────────────
  // A job billed once may have used several cars. Each car keeps all of its
  // own costs and takes an equal share of what the job earned, so two coasters
  // on one trip each show half the revenue rather than the full amount twice.
  const buildVehiclePerformance = () => {
    const worked = bookingVehicles.filter((bv: any) => bv.invoice_number);
    const totalStints = worked.length;

    const revenueShare = (bv: any) => {
      const total = parseFloat(bv.paid_amount) || 0;
      const n = bv.vehicles_on_booking || 1;
      return total / n;
    };
    const costOf = (bv: any) =>
      (parseFloat(bv.fuel_cost) || 0) +
      (parseFloat(bv.driver_allowance) || 0) +
      (parseFloat(bv.emergency_cost) || 0) +
      (parseFloat(bv.owner_payout_amount) || 0);

    const rows = vehicles.map((v: any) => {
      const mine = worked.filter((bv: any) => bv.vehicle_id === v.id);
      const rev = mine.reduce((s: number, bv: any) => s + revenueShare(bv), 0);
      const costs = mine.reduce((s: number, bv: any) => s + costOf(bv), 0);
      return {
        id: v.id,
        name: `${v.make} ${v.model}`,
        plate: v.plate_number,
        category: v.category,
        trips: mine.length,
        revenue: rev,
        costs,
        net: rev - costs,
        share: totalStints > 0 ? (mine.length / totalStints) * 100 : 0,
        borrowed: false,
      };
    });

    const bb = worked.filter((bv: any) => bv.is_borrowed);
    if (bb.length > 0) {
      const rev = bb.reduce((s: number, bv: any) => s + revenueShare(bv), 0);
      const costs = bb.reduce((s: number, bv: any) => s + costOf(bv), 0);
      rows.push({
        id: -1,
        name: "Borrowed vehicles",
        plate: "",
        category: "Hired in for single jobs",
        trips: bb.length,
        revenue: rev,
        costs,
        net: rev - costs,
        share: totalStints > 0 ? (bb.length / totalStints) * 100 : 0,
        borrowed: true,
      });
    }

    return rows.sort((a: any, b: any) => b.net - a.net);
  };

  // ── running series across the period ───────────────────────────
  // Built from the bookings and expenses already loaded, so no extra calls.
  // Totals accumulate, which is how a period actually builds up.
  const series = (() => {
    if (!data?.period) return [];
    const start = new Date(data.period.startDate);
    const end = new Date(data.period.endDate);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const byMonth = days > 62;

    const buckets: { label: string; from: Date; to: Date }[] = [];
    if (byMonth) {
      const c = new Date(start.getFullYear(), start.getMonth(), 1);
      while (c <= end) {
        buckets.push({
          label: c.toLocaleDateString("en-TZ", { month: "short" }),
          from: new Date(c.getFullYear(), c.getMonth(), 1),
          to: new Date(c.getFullYear(), c.getMonth() + 1, 0, 23, 59, 59),
        });
        c.setMonth(c.getMonth() + 1);
      }
    } else {
      const c = new Date(start);
      while (c <= end) {
        buckets.push({
          label: `${c.getDate()} ${c.toLocaleDateString("en-TZ", { month: "short" })}`,
          from: new Date(c.getFullYear(), c.getMonth(), c.getDate()),
          to: new Date(c.getFullYear(), c.getMonth(), c.getDate(), 23, 59, 59),
        });
        c.setDate(c.getDate() + 1);
      }
    }

    let rev = 0, veh = 0, comp = 0;
    return buckets.map(b => {
      const inB = (d: string) => {
        if (!d) return false;
        const t = new Date(d).getTime();
        return t >= b.from.getTime() && t <= b.to.getTime();
      };
      rev += bookings.filter((x: any) => isInvoiced(x) && inB(x.pickup_datetime))
        .reduce((s: number, x: any) => s + (parseFloat(x.paid_amount) || 0), 0);
      veh += expenses.filter((e: any) => isVehicleCost(e) && inB(e.expense_date))
        .reduce((s: number, e: any) => s + (parseFloat(e.amount) || 0), 0);
      comp += expenses.filter((e: any) => !isVehicleCost(e) && inB(e.expense_date))
        .reduce((s: number, e: any) => s + (parseFloat(e.amount) || 0), 0);
      return { label: b.label, revenue: rev, vehicle: veh, company: comp, net: rev - veh - comp };
    });
  })();

  const hasSeries = series.some(p => p.revenue || p.vehicle || p.company);
  const SW = 320, SH = 130;
  const sVals = series.flatMap(p => [p.revenue, p.vehicle, p.company, p.net]);
  const sStep = niceStep((Math.max(...sVals, 0) - Math.min(...sVals, 0) || 1) / 4);
  const sMax = Math.ceil((Math.max(...sVals, 0) || 1) / sStep) * sStep;
  const sMin = Math.floor(Math.min(...sVals, 0) / sStep) * sStep;
  const sTicks: number[] = [];
  for (let v = sMax; v >= sMin - 0.0001; v -= sStep) sTicks.push(Math.round(v));
  const sy = (v: number) => SH - ((v - sMin) / ((sMax - sMin) || 1)) * SH;
  const sx = (i: number) => series.length <= 1 ? 0 : (i / (series.length - 1)) * SW;
  const sLine = (k: "revenue" | "vehicle" | "company" | "net") =>
    series.map((p, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(p[k]).toFixed(1)}`).join(" ");
  const sLabelEvery = Math.max(1, Math.ceil(series.length / 6));

  // ── expenses by category ───────────────────────────────────────
  const catTotals: Record<string, number> = {};
  expenses.forEach((e: any) => {
    const key = e.category || "other";
    catTotals[key] = (catTotals[key] || 0) + parseFloat(e.amount || 0);
  });
  const totalExpenses = vehicleCosts + companyCosts;
  const CAT_COLORS = ["#b8843a", "#1c1814", "#c2410c", "#0f766e", "#7e22ce", "#a16207", "#9f1239", "#166534"];
  let catOffset = 0;
  const cats = Object.entries(catTotals)
    .map(([key, amount]) => ({ key, amount, label: EXPENSE_CATEGORIES[key] || key.replace(/_/g, " ") }))
    .sort((a, b) => b.amount - a.amount)
    .map((c, i) => {
      const pct = totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0;
      const row = { ...c, pct, offset: catOffset, color: CAT_COLORS[i % CAT_COLORS.length] };
      catOffset += pct;
      return row;
    });

  const vehiclePerf = data ? buildVehiclePerformance() : [];
  const idleVehicles = vehiclePerf.filter((v: any) => !v.borrowed && v.trips === 0);

  const getPeriodLabel = () => {
    if (filterMode === "all") return "All Time";
    if (filterMode === "week") return `Week ${selectedWeek} of ${selectedYear}`;
    if (filterMode === "month") return `${MONTHS[selectedMonth]} ${selectedYear}`;
    return `Full Year ${selectedYear}`;
  };

  const generatePDF = async () => {
    if (!data) return;
    setGenerating(true);

    const periodLabel = getPeriodLabel();

    const vehExp: Record<string, number> = {};
    const compExp: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const cat = EXPENSE_CATEGORIES[e.category] || e.category;
      const target = isVehicleCost(e) ? vehExp : compExp;
      target[cat] = (target[cat] || 0) + parseFloat(e.amount);
    });

    const serviceCount: Record<string, { count: number; revenue: number }> = {};
    bookings.forEach((b: any) => {
      const svc = SERVICE_LABELS[b.service_type] || b.service_type;
      if (!serviceCount[svc]) serviceCount[svc] = { count: 0, revenue: 0 };
      serviceCount[svc].count++;
      serviceCount[svc].revenue += parseFloat(b.paid_amount || 0);
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Zuri Tours — ${periodLabel} Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; color: #1c1814; background: white; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #b8843a; padding-bottom: 20px; margin-bottom: 30px; }
    .company-name { font-size: 28px; font-weight: bold; color: #1c1814; }
    .company-sub { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #b8843a; margin-top: 4px; }
    .report-title { text-align: right; }
    .report-title h2 { font-size: 20px; color: #1c1814; }
    .report-title p { font-size: 12px; color: #888; margin-top: 4px; }
    .section { margin-bottom: 30px; page-break-inside: avoid; }
    .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; color: #1c1814; }
    .section-note { font-size: 11px; color: #888; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f9f7f4; text-align: left; padding: 8px 10px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #888; border-bottom: 1px solid #e5e7eb; }
    td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
    tr:last-child td { border-bottom: none; }
    .amount-green { color: #16a34a; font-weight: 600; }
    .amount-red { color: #dc2626; font-weight: 600; }
    .amount-gold { color: #b8843a; font-weight: 600; }
    .total-row td { font-weight: bold; border-top: 2px solid #e5e7eb; background: #f9f7f4; }
    .subtotal-row td { font-weight: bold; border-top: 1px solid #e5e7eb; background: #fdfcfa; }
    .idle-row td { background: #fffbeb; }
    .pl-line { display: flex; justify-content: space-between; padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
    .pl-line.header-line { background: #f9f7f4; font-weight: bold; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #888; }
    .pl-line.subtotal { border-top: 1px solid #e5e7eb; font-weight: bold; background: #fdfcfa; }
    .pl-line.final { border-top: 2px solid #b8843a; font-weight: bold; font-size: 15px; background: #fefce8; }
    .pl-box { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #888; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #16a34a; }
    .badge-amber { background: #fef3c7; color: #d97706; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .badge-purple { background: #f3e8ff; color: #7e22ce; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <div class="company-name">ZURI TOURS</div>
      <div class="company-sub">&amp; Car Hire · Tanzania</div>
      <div style="font-size:11px;color:#888;margin-top:8px;">Mikocheni, Dar es Salaam</div>
      <div style="font-size:11px;color:#888;">info@zuritours.co.tz · zuritours.co.tz</div>
    </div>
    <div class="report-title">
      <h2>Financial Report</h2>
      <p>${periodLabel}</p>
      <p style="margin-top:4px;">Generated: ${new Date().toLocaleDateString("en-TZ", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Profit &amp; Loss</div>
    <div class="section-note">Split into two layers: what the vehicles cost to run, and what the company costs to keep open.</div>
    <div class="pl-box">
      <div class="pl-line header-line"><span>Revenue</span><span></span></div>
      <div class="pl-line"><span>Invoiced trips (${invoicedTrips.length})</span><span class="amount-green">+${revenue.toLocaleString()} TZS</span></div>

      <div class="pl-line header-line"><span>Vehicle &amp; trip costs</span><span></span></div>
      ${Object.entries(vehExp).sort(([,a],[,b]) => b-a).map(([cat, amt]) => `
        <div class="pl-line"><span>${cat}</span><span class="amount-red">-${amt.toLocaleString()} TZS</span></div>
      `).join("") || '<div class="pl-line"><span style="color:#888;">No vehicle costs in this period</span><span>—</span></div>'}
      <div class="pl-line subtotal"><span>Gross from operations</span><span class="${grossFromOperations >= 0 ? "amount-green" : "amount-red"}">${grossFromOperations >= 0 ? "+" : ""}${grossFromOperations.toLocaleString()} TZS</span></div>

      <div class="pl-line header-line"><span>Company overheads</span><span></span></div>
      ${Object.entries(compExp).sort(([,a],[,b]) => b-a).map(([cat, amt]) => `
        <div class="pl-line"><span>${cat}</span><span class="amount-red">-${amt.toLocaleString()} TZS</span></div>
      `).join("") || '<div class="pl-line"><span style="color:#888;">No company costs in this period</span><span>—</span></div>'}

      <div class="pl-line final"><span>${netProfit >= 0 ? "Net Profit" : "Net Loss"}</span><span class="${netProfit >= 0 ? "amount-gold" : "amount-red"}">${netProfit >= 0 ? "+" : ""}${netProfit.toLocaleString()} TZS</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Key Indicators</div>
    <table>
      <tbody>
        <tr><td>Average revenue per trip</td><td class="amount-gold">${Math.round(avgPerTrip).toLocaleString()} TZS</td></tr>
        <tr><td>Company overheads as share of revenue</td><td class="${overheadRatio > 50 ? "amount-red" : "amount-gold"}">${Math.round(overheadRatio)}%</td></tr>
        <tr><td>Money still owed by customers</td><td class="${outstandingAmount > 0 ? "amount-red" : "amount-green"}">${outstandingAmount.toLocaleString()} TZS (${unpaid.length} invoice${unpaid.length === 1 ? "" : "s"})</td></tr>
        <tr><td>Vehicles that earned nothing</td><td class="${idleVehicles.length > 0 ? "amount-red" : "amount-green"}">${idleVehicles.length}${idleVehicles.length > 0 ? " — " + idleVehicles.map((v: any) => v.name).join(", ") : ""}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Vehicle Performance</div>
    <div class="section-note">What each vehicle earned, what its trips cost, and what it contributed. Idle vehicles earn nothing but still cost insurance and licences.</div>
    <table>
      <thead><tr><th>Vehicle</th><th>Trips</th><th>Share</th><th>Revenue (TZS)</th><th>Trip Costs (TZS)</th><th>Net (TZS)</th></tr></thead>
      <tbody>
        ${vehiclePerf.map((v: any) => `
          <tr class="${v.trips === 0 && !v.borrowed ? "idle-row" : ""}">
            <td>
              ${v.name}${v.plate ? ` <span style="color:#888;font-size:11px;">· ${v.plate}</span>` : ""}
              ${v.borrowed ? ' <span class="badge badge-purple">Borrowed</span>' : ""}
              ${v.trips === 0 && !v.borrowed ? ' <span class="badge badge-amber">Idle</span>' : ""}
            </td>
            <td>${v.trips}</td>
            <td>${Math.round(v.share)}%</td>
            <td class="amount-green">${v.revenue > 0 ? "+" + Math.round(v.revenue).toLocaleString() : "—"}</td>
            <td class="amount-red">${v.costs > 0 ? "-" + Math.round(v.costs).toLocaleString() : "—"}</td>
            <td class="${v.net >= 0 ? "amount-gold" : "amount-red"}">${v.net !== 0 ? (v.net >= 0 ? "+" : "") + Math.round(v.net).toLocaleString() : "—"}</td>
          </tr>
        `).join("")}
        <tr class="total-row">
          <td>TOTAL</td>
          <td>${vehiclePerf.reduce((s: number, v: any) => s + v.trips, 0)}</td>
          <td>100%</td>
          <td class="amount-green">+${vehiclePerf.reduce((s: number, v: any) => s + v.revenue, 0).toLocaleString()}</td>
          <td class="amount-red">-${vehiclePerf.reduce((s: number, v: any) => s + v.costs, 0).toLocaleString()}</td>
          <td class="amount-gold">+${vehiclePerf.reduce((s: number, v: any) => s + v.net, 0).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Revenue by Service Type</div>
    <table>
      <thead><tr><th>Service</th><th>Trips</th><th>Revenue (TZS)</th><th>% of Revenue</th></tr></thead>
      <tbody>
        ${Object.entries(serviceCount).sort(([,a],[,b]) => b.revenue - a.revenue).map(([svc, d]) => `
          <tr>
            <td>${svc}</td>
            <td>${d.count}</td>
            <td class="amount-green">+${d.revenue.toLocaleString()}</td>
            <td>${revenue > 0 ? Math.round((d.revenue/revenue)*100) : 0}%</td>
          </tr>
        `).join("")}
        <tr class="total-row"><td>TOTAL</td><td>${summary.totalBookings}</td><td class="amount-green">+${revenue.toLocaleString()}</td><td>100%</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Trip Details</div>
    <table>
      <thead><tr><th>Ref</th><th>Date</th><th>Customer</th><th>Service</th><th>Vehicle</th><th>Driver</th><th>Amount (TZS)</th><th>Payment</th></tr></thead>
      <tbody>
        ${bookings.map((b: any) => `
          <tr>
            <td style="font-family:monospace;color:#b8843a;">${b.booking_ref}</td>
            <td>${b.pickup_datetime ? new Date(b.pickup_datetime).toLocaleDateString("en-TZ",{day:"numeric",month:"short",year:"numeric"}) : "—"}</td>
            <td>${b.customer_name || "—"}</td>
            <td>${SERVICE_LABELS[b.service_type] || b.service_type}</td>
            <td>${(() => {
              const bvs = bookingVehicles.filter((bv: any) => bv.booking_id === b.id);
              if (bvs.length === 0) return "—";
              if (bvs.length === 1) {
                const bv = bvs[0];
                return bv.is_borrowed ? (bv.borrowed_vehicle_desc || "Borrowed") : [bv.vehicle_make, bv.vehicle_model].filter(Boolean).join(" ") || "—";
              }
              return bvs.length + " vehicles";
            })()}</td>
            <td>${b.driver_name || "—"}</td>
            <td class="amount-green">+${parseFloat(b.paid_amount||0).toLocaleString()}</td>
            <td><span class="badge ${b.payment_status==="paid"?"badge-green":b.invoice_number?"badge-amber":"badge-red"}">${b.payment_status==="paid"?"Paid":b.invoice_number?"Awaiting payment":"Not invoiced"}</span></td>
          </tr>
        `).join("")}
        <tr class="total-row"><td colspan="6">TOTAL REVENUE</td><td class="amount-green">+${revenue.toLocaleString()}</td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">All Expense Records</div>
    <table>
      <thead><tr><th>Date</th><th>Layer</th><th>Category</th><th>Description</th><th>Amount (TZS)</th></tr></thead>
      <tbody>
        ${expenses.map((e: any) => `
          <tr>
            <td>${new Date(e.expense_date).toLocaleDateString("en-TZ",{day:"numeric",month:"short",year:"numeric"})}</td>
            <td>${isVehicleCost(e) ? "Vehicle" : "Company"}</td>
            <td>${EXPENSE_CATEGORIES[e.category]||e.category}</td>
            <td>${e.description}</td>
            <td class="amount-red">-${parseFloat(e.amount).toLocaleString()}</td>
          </tr>
        `).join("")}
        <tr class="total-row"><td colspan="4">TOTAL</td><td class="amount-red">-${(vehicleCosts + companyCosts).toLocaleString()}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div>Zuri Tours &amp; Car Hire · Mikocheni, Dar es Salaam · zuritours.co.tz</div>
    <div>This report is confidential and intended for internal use only.</div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        setGenerating(false);
      }, 500);
    } else {
      setGenerating(false);
    }
  };

  if (!loading && role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-20 h-20 rounded-full bg-ink/5 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted" />
        </div>
        <h2 className="font-display text-2xl font-medium text-ink mb-2">Reports are Private</h2>
        <p className="text-muted text-sm max-w-xs">This section is only accessible to the business owner.</p>
      </div>
    );
  }

  const serviceCount: Record<string, { count: number; revenue: number }> = {};
  bookings.forEach((b: any) => {
    const svc = SERVICE_LABELS[b.service_type] || b.service_type;
    if (!serviceCount[svc]) serviceCount[svc] = { count: 0, revenue: 0 };
    serviceCount[svc].count++;
    serviceCount[svc].revenue += parseFloat(b.paid_amount || 0);
  });

  const bestVehicle = vehiclePerf.find((v: any) => !v.borrowed && v.trips > 0);

  const vehExpUI: Record<string, number> = {};
  const compExpUI: Record<string, number> = {};
  expenses.forEach((e: any) => {
    const cat = EXPENSE_CATEGORIES[e.category] || e.category;
    const target = isVehicleCost(e) ? vehExpUI : compExpUI;
    target[cat] = (target[cat] || 0) + parseFloat(e.amount);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink">
            Business <em className="italic text-gold">Reports</em>
          </h1>
          <p className="text-muted text-sm mt-1">Comprehensive insight into your fleet performance.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-2 border border-ink/15 rounded-xl px-4 py-2.5 text-sm text-ink">
            <Calendar className="w-4 h-4 text-muted" />
            {getPeriodLabel()}
          </span>
        <button onClick={generatePDF} disabled={generating || !data}
          className="flex items-center gap-2 bg-gold text-ink px-5 py-2.5 text-sm font-semibold hover:bg-gold/90 transition-colors rounded-xl disabled:opacity-50">
          <Download className="w-4 h-4" />
          {generating ? "Generating..." : "Export"}
        </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-paper rounded-2xl border border-ink/10 p-4">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-xs tracking-widest uppercase text-muted font-medium mr-2">Report Period</span>
          {(["week","month","year","all"] as FilterMode[]).map(m => (
            <button key={m} onClick={() => setFilterMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMode === m ? "bg-ink text-paper" : "bg-paper-soft text-muted hover:text-ink border border-ink/10"
              }`}>
              {m === "all" ? "All Time" : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {filterMode === "week" && (
            <>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))}
                className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
                {Array.from({ length: 52 }, (_, i) => (
                  <option key={i+1} value={i+1}>Week {i+1}</option>
                ))}
              </select>
            </>
          )}
          {filterMode === "month" && (
            <>
              <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          {filterMode === "year" && (
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm animate-pulse">Loading report...</div>
      ) : !summary ? null : (
        <>
          {filterMode === "month" && <WrittenAnalysis year={selectedYear} month={selectedMonth} />}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportCard icon={TrendingUp} tone="green" label="Total Revenue"
              value={`${revenue.toLocaleString()} TZS`} sub={`From ${invoicedTrips.length} invoiced trips`}
              delta={prevM && prev ? <Delta current={revenue} previous={prevM.revenue} label={prev.label} /> : null}
              spark={hasSeries ? series.map(p => p.revenue) : null} sparkColor="#16a34a" />

            <ReportCard icon={Car} tone="red" label="Total Vehicle Costs"
              value={`${vehicleCosts.toLocaleString()} TZS`} sub={`Across ${expenses.filter(isVehicleCost).length} cost records`}
              delta={prevM && prev ? <Delta current={vehicleCosts} previous={prevM.vehicleCosts} label={prev.label} lowerIsBetter /> : null}
              spark={hasSeries ? series.map(p => p.vehicle) : null} sparkColor="#ef4444" />

            <ReportCard icon={Building2} tone="orange" label="Company Costs"
              value={`${companyCosts.toLocaleString()} TZS`}
              sub={companyCosts === 0 ? "No company costs" : `Across ${expenses.filter((e: any) => !isVehicleCost(e)).length} records`}
              delta={prevM && prev ? <Delta current={companyCosts} previous={prevM.companyCosts} label={prev.label} lowerIsBetter /> : null}
              spark={hasSeries ? series.map(p => p.company) : null} sparkColor="#f97316" />

            <ReportCard icon={DollarSign} tone={netProfit >= 0 ? "gold" : "red"}
              label={netProfit >= 0 ? "Net Profit" : "Net Loss"}
              value={`${netProfit < 0 ? "-" : ""}${Math.abs(netProfit).toLocaleString()} TZS`}
              sub={revenue > 0 ? `Profit margin ${Math.round((netProfit / revenue) * 100)}%` : "No revenue yet"}
              delta={prevM && prev ? <Delta current={netProfit} previous={prevM.net} label={prev.label} /> : null}
              spark={hasSeries ? series.map(p => p.net) : null} sparkColor="#b8843a" />
          </div>

          {/* Trend + categories */}
          {hasSeries && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden lg:col-span-2">
                <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between flex-wrap gap-3">
                  <h2 className="font-display text-xl font-medium">Profit &amp; Loss Trend</h2>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-600" />Revenue</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Vehicle</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" />Company</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gold" />Net</span>
                  </div>
                </div>

                <div className="px-6 pt-5 pb-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col justify-between text-[0.65rem] text-muted text-right w-12 flex-shrink-0" style={{ height: "190px" }}>
                      {sTicks.map((v, i) => (
                        <span key={i} className={v === 0 ? "text-ink/60 font-medium" : ""}>{compact(v)}</span>
                      ))}
                    </div>

                    <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full" style={{ height: "190px" }} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="repRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {sTicks.map((v, i) => (
                        <line key={i} x1="0" y1={sy(v)} x2={SW} y2={sy(v)}
                          stroke="currentColor"
                          className={v === 0 ? "text-ink/25" : "text-ink/[0.07]"}
                          strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      ))}

                      <path d={`${sLine("revenue")} L${SW},${sy(0)} L0,${sy(0)} Z`} fill="url(#repRev)" />

                      <path d={sLine("vehicle")} fill="none" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      <path d={sLine("company")} fill="none" stroke="#f97316" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      <path d={sLine("net")} fill="none" stroke="#b8843a" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      <path d={sLine("revenue")} fill="none" stroke="#16a34a" strokeWidth="2" vectorEffect="non-scaling-stroke" />

                      {series.map((p, i) => (
                        <g key={i}>
                          <circle cx={sx(i)} cy={sy(p.vehicle)} r="2.5" fill="#ef4444" vectorEffect="non-scaling-stroke" />
                          <circle cx={sx(i)} cy={sy(p.company)} r="2.5" fill="#f97316" vectorEffect="non-scaling-stroke" />
                          <circle cx={sx(i)} cy={sy(p.net)} r="2.5" fill="#b8843a" vectorEffect="non-scaling-stroke" />
                          <circle cx={sx(i)} cy={sy(p.revenue)} r="2.5" fill="#16a34a" vectorEffect="non-scaling-stroke" />
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="relative mt-2 ml-[3.75rem] h-4">
                    {series.map((p, i) => (
                      i % sLabelEvery === 0 || i === series.length - 1 ? (
                        <span key={i}
                          className="absolute text-[0.65rem] text-muted -translate-x-1/2 whitespace-nowrap"
                          style={{ left: `${series.length <= 1 ? 0 : (i / (series.length - 1)) * 100}%` }}>
                          {p.label}
                        </span>
                      ) : null
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-ink/10">
                  <h2 className="font-display text-xl font-medium">Expenses by Category</h2>
                </div>
                <div className="p-6">
                  {totalExpenses === 0 ? (
                    <p className="text-sm text-muted text-center py-8">No expenses in this period.</p>
                  ) : (
                    <>
                      <div className="relative w-32 h-32 mx-auto mb-5 flex-shrink-0">
                        <svg viewBox="0 0 42 42" className="-rotate-90 w-full h-full">
                          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="currentColor" className="text-ink/5" strokeWidth="4" />
                          {cats.map(c => (
                            <circle key={c.key} cx="21" cy="21" r="15.9155" fill="none"
                              stroke={c.color} strokeWidth="4"
                              strokeDasharray={`${c.pct} ${100 - c.pct}`}
                              strokeDashoffset={-c.offset} />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-display text-base font-medium text-ink leading-none">{compact(totalExpenses)}</span>
                          <span className="text-[0.55rem] text-muted uppercase tracking-widest mt-1">TZS Total</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {cats.slice(0, 6).map(c => (
                          <div key={c.key} className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                            <span className="text-ink-soft flex-1 truncate">{c.label}</span>
                            <span className="text-ink font-medium whitespace-nowrap">{Math.round(c.amount).toLocaleString()}</span>
                            <span className="text-muted w-9 text-right">{Math.round(c.pct)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="px-6 py-3 border-t border-ink/5 text-xs text-muted">
                  {expenses.length} expense{expenses.length === 1 ? "" : "s"} recorded
                </div>
              </div>

              <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-ink/10">
                <h2 className="font-display text-xl font-medium">Top Expenses</h2>
              </div>
              <div className="divide-y divide-ink/5">
                {cats.slice(0, 5).map(c => (
                  <div key={c.key} className="px-6 py-3 flex items-center gap-4">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                      style={{ background: `${c.color}1a`, color: c.color }}>
                      <Receipt className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-medium text-ink truncate">{c.label}</span>
                    <span className="text-sm text-ink whitespace-nowrap">{Math.round(c.amount).toLocaleString()} TZS</span>
                    <span className="text-xs text-muted w-12 text-right">{Math.round(c.pct)}%</span>
                  </div>
                ))}
              </div>
                <div className="px-6 py-3 border-t border-ink/5">
                  <Link href="/admin/finance" className="text-xs text-gold hover:underline flex items-center gap-1">
                    View all expenses <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Two-layer P&L */}
          <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-ink/10">
              <h2 className="font-display text-xl font-medium">Profit &amp; Loss</h2>
            </div>

            <div className="divide-y divide-ink/5">
              <div className="px-6 py-2.5 bg-paper-soft text-xs tracking-widest uppercase text-muted font-medium">Revenue</div>
              <div className="px-6 py-3 flex justify-between text-sm">
                <span className="text-ink">Invoiced trips ({invoicedTrips.length})</span>
                <span className="text-green-600 font-semibold">+{revenue.toLocaleString()} TZS</span>
              </div>

              <div className="px-6 py-2.5 bg-paper-soft text-xs tracking-widest uppercase text-muted font-medium flex items-center gap-1.5">
                <Car className="w-3 h-3" /> Vehicle &amp; trip costs
              </div>
              {Object.keys(vehExpUI).length === 0 ? (
                <div className="px-6 py-3 text-sm text-muted">No vehicle costs in this period</div>
              ) : Object.entries(vehExpUI).sort(([,a],[,b]) => (b as number)-(a as number)).map(([cat, amt]) => (
                <div key={cat} className="px-6 py-2.5 flex justify-between text-sm">
                  <span className="text-ink-soft">{cat}</span>
                  <span className="text-red-500">-{(amt as number).toLocaleString()} TZS</span>
                </div>
              ))}
              <div className="px-6 py-3 flex justify-between text-sm bg-paper-soft/50 font-semibold">
                <span className="text-ink">Gross from operations</span>
                <span className={grossFromOperations >= 0 ? "text-green-600" : "text-red-600"}>
                  {grossFromOperations >= 0 ? "+" : ""}{grossFromOperations.toLocaleString()} TZS
                </span>
              </div>

              <div className="px-6 py-2.5 bg-paper-soft text-xs tracking-widest uppercase text-muted font-medium flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> Company overheads
              </div>
              {Object.keys(compExpUI).length === 0 ? (
                <div className="px-6 py-3 text-sm text-muted">No company costs in this period</div>
              ) : Object.entries(compExpUI).sort(([,a],[,b]) => (b as number)-(a as number)).map(([cat, amt]) => (
                <div key={cat} className="px-6 py-2.5 flex justify-between text-sm">
                  <span className="text-ink-soft">{cat}</span>
                  <span className="text-red-500">-{(amt as number).toLocaleString()} TZS</span>
                </div>
              ))}
            </div>

            <div className={`px-6 py-4 flex justify-between items-center border-t-2 ${netProfit >= 0 ? "border-gold bg-gold/5" : "border-red-400 bg-red-50"}`}>
              <span className="font-display text-lg font-medium text-ink">{netProfit >= 0 ? "Net Profit" : "Net Loss"}</span>
              <span className={`font-display text-2xl font-bold ${netProfit >= 0 ? "text-gold" : "text-red-600"}`}>
                {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()} TZS
              </span>
            </div>
          </div>

          {prevM && prev && (
            <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-ink/10">
                <h2 className="font-display text-xl font-medium">
                  {getPeriodLabel()} <span className="text-muted font-normal">vs</span> {prev.label}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ink/10 bg-paper-soft">
                      {["", getPeriodLabel(), prev.label, "Change"].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-xs tracking-widest uppercase text-muted whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {[
                      { label: "Revenue", now: revenue, then: prevM.revenue, lowerIsBetter: false },
                      { label: "Vehicle costs", now: vehicleCosts, then: prevM.vehicleCosts, lowerIsBetter: true },
                      { label: "Company costs", now: companyCosts, then: prevM.companyCosts, lowerIsBetter: true },
                      { label: "Net", now: netProfit, then: prevM.net, lowerIsBetter: false },
                    ].map(row => {
                      const diff = row.now - row.then;
                      const pct = row.then ? Math.round((diff / Math.abs(row.then)) * 100) : null;
                      const good = row.lowerIsBetter ? diff < 0 : diff > 0;
                      return (
                        <tr key={row.label} className="hover:bg-paper-soft transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-ink">{row.label}</td>
                          <td className="px-4 py-3 text-sm text-ink whitespace-nowrap">{row.now.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{row.then.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {pct === null ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <span className={`font-semibold ${diff === 0 ? "text-muted" : good ? "text-green-600" : "text-red-500"}`}>
                                {diff > 0 ? "+" : ""}{diff.toLocaleString()}
                                <span className="font-normal text-muted"> ({pct > 0 ? "+" : ""}{pct}%)</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Key indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-paper rounded-2xl border border-ink/10 p-5">
              <div className="text-xs tracking-widest uppercase text-muted mb-1">Avg per trip</div>
              <div className="font-display text-xl font-medium text-ink">{Math.round(avgPerTrip).toLocaleString()}</div>
              <div className="text-xs text-muted mt-0.5">TZS revenue per invoiced trip</div>
            </div>
            <div className={`rounded-2xl border p-5 ${overheadRatio > 50 ? "bg-red-50 border-red-200" : "bg-paper border-ink/10"}`}>
              <div className="text-xs tracking-widest uppercase text-muted mb-1">Overhead ratio</div>
              <div className={`font-display text-xl font-medium ${overheadRatio > 50 ? "text-red-600" : "text-ink"}`}>{Math.round(overheadRatio)}%</div>
              <div className="text-xs text-muted mt-0.5">of revenue goes to running the office</div>
            </div>
            <div className={`rounded-2xl border p-5 ${outstandingAmount > 0 ? "bg-amber-50 border-amber-200" : "bg-paper border-ink/10"}`}>
              <div className="text-xs tracking-widest uppercase text-muted mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Owed to Zuri
              </div>
              <div className={`font-display text-xl font-medium ${outstandingAmount > 0 ? "text-amber-700" : "text-ink"}`}>{outstandingAmount.toLocaleString()}</div>
              <div className="text-xs text-muted mt-0.5">TZS across {unpaid.length} invoice{unpaid.length === 1 ? "" : "s"}</div>
            </div>
            <div className={`rounded-2xl border p-5 ${idleVehicles.length > 0 ? "bg-amber-50 border-amber-200" : "bg-paper border-ink/10"}`}>
              <div className="text-xs tracking-widest uppercase text-muted mb-1">Idle vehicles</div>
              <div className={`font-display text-xl font-medium ${idleVehicles.length > 0 ? "text-amber-700" : "text-ink"}`}>{idleVehicles.length}</div>
              <div className="text-xs text-muted mt-0.5">earned nothing this period</div>
            </div>
          </div>

          {/* Per-vehicle performance + trips */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-display text-xl font-medium flex items-center gap-2">
                  Vehicle Performance
                  <span title="Revenue is shared equally between the cars used on the same job">
                    <Info className="w-3.5 h-3.5 text-muted" />
                  </span>
                </h2>
              </div>
              {bestVehicle && (
                <span className="text-xs bg-gold/10 text-gold border border-gold/30 px-3 py-1.5 rounded-full font-medium">
                  Best Performer: {bestVehicle.name}
                </span>
              )}
            </div>

            {idleVehicles.length > 0 && (
              <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-amber-800">
                  <span className="font-medium">Idle</span>
                  <span className="text-amber-700"> — {idleVehicles.map((v: any) => v.name).join(", ")}</span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink/10 bg-paper-soft">
                    {["Vehicle","Trips","Utilisation","Revenue","Trip Costs","Net"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs tracking-widest uppercase text-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {vehiclePerf.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">No vehicles to report on.</td></tr>
                  ) : vehiclePerf.map((v: any) => {
                    const idle = v.trips === 0 && !v.borrowed;
                    return (
                      <tr key={v.id} className={idle ? "bg-amber-50/40" : "hover:bg-paper-soft transition-colors"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-ink">{v.name}</span>
                            {v.borrowed && <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">Borrowed</span>}
                            {idle && <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Idle</span>}
                          </div>
                          <div className="text-xs text-muted mt-0.5">{v.plate || v.category}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-ink font-medium">{v.trips}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-ink/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                v.trips === 0 ? "bg-ink/10" : v.borrowed ? "bg-purple-400" : "bg-gold"
                              }`} style={{ width: `${Math.max(v.share, v.trips > 0 ? 4 : 0)}%` }} />
                            </div>
                            <span className={`text-xs ${v.trips === 0 ? "text-muted" : "text-ink"}`}>{Math.round(v.share)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {v.revenue > 0 ? <span className="text-green-600 font-semibold">+{Math.round(v.revenue).toLocaleString()}</span> : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {v.costs > 0 ? <span className="text-red-500">-{Math.round(v.costs).toLocaleString()}</span> : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {v.trips > 0 ? (
                            <span className={`font-bold ${v.net >= 0 ? "text-gold" : "text-red-600"}`}>{v.net >= 0 ? "+" : ""}{Math.round(v.net).toLocaleString()}</span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

<div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
              <h2 className="font-display text-xl font-medium">Trips in Period</h2>
              <span className="text-xs text-muted">{bookings.length} bookings</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-ink/5 border-b border-ink/10">
              <div className="px-6 py-4">
                <div className="font-display text-2xl font-medium text-ink">{bookings.length}</div>
                <div className="text-xs text-muted mt-0.5">Total Trips</div>
              </div>
              <div className="px-6 py-4">
                <div className="font-display text-2xl font-medium text-green-600">
                  {bookings.filter((b: any) => b.status === "completed").length}
                </div>
                <div className="text-xs text-muted mt-0.5">Completed</div>
              </div>
              <div className="px-6 py-4">
                <div className="font-display text-2xl font-medium text-red-500">
                  {bookings.filter((b: any) => b.status === "cancelled").length}
                </div>
                <div className="text-xs text-muted mt-0.5">Cancelled</div>
              </div>
              <div className="px-6 py-4">
                <div className="font-display text-2xl font-medium text-gold">{revenue.toLocaleString()}</div>
                <div className="text-xs text-muted mt-0.5">Total Revenue · TZS</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink/10 bg-paper-soft">
                    {["Ref","Date","Customer","Service","Vehicle","Driver","Revenue","Payment"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs tracking-widest uppercase text-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {bookings.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted text-sm">No trips in this period.</td></tr>
                  ) : bookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-paper-soft">
                      <td className="px-4 py-3 font-mono text-xs text-gold">{b.booking_ref}</td>
                      <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
                        {b.pickup_datetime ? new Date(b.pickup_datetime).toLocaleDateString("en-TZ",{day:"numeric",month:"short"}) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">{b.customer_name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{SERVICE_LABELS[b.service_type] || b.service_type}</td>
                      <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">
                        {(() => {
                          const bvs = bookingVehicles.filter((bv: any) => bv.booking_id === b.id);
                          if (bvs.length === 0) return "—";
                          if (bvs.length === 1) {
                            const bv = bvs[0];
                            return bv.is_borrowed ? (bv.borrowed_vehicle_desc || "Borrowed") : [bv.vehicle_make, bv.vehicle_model].filter(Boolean).join(" ") || "—";
                          }
                          return `${bvs.length} vehicles`;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{b.driver_name || "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
                        {parseFloat(b.paid_amount||0) > 0 ? `+${parseFloat(b.paid_amount).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                          b.payment_status === "paid" ? "bg-green-100 text-green-700" :
                          b.invoice_number ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {b.payment_status === "paid" ? "Paid" : b.invoice_number ? "Awaiting payment" : "Not invoiced"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>

          {/* Service breakdown */}
          <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-ink/10">
              <h2 className="font-display text-xl font-medium">Revenue by Service</h2>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(serviceCount).sort(([,a],[,b]) => b.revenue - a.revenue).map(([svc, d]) => {
                const pct = revenue > 0 ? (d.revenue / revenue) * 100 : 0;
                return (
                  <div key={svc}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink">{svc}</span>
                      <span className="text-muted">{d.count} trips · {d.revenue.toLocaleString()} TZS ({Math.round(pct)}%)</span>
                    </div>
                    <div className="h-2 bg-gold/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(serviceCount).length === 0 && (
                <p className="text-muted text-sm text-center py-4">No bookings in this period.</p>
              )}
            </div>
          </div>

          {/* Trips in period */}

        </>
      )}
    </div>
  );
}

// White card carrying its own trend line, so the four headline numbers can be
// compared without switching to the chart below.
function ReportCard({ icon: Icon, tone, label, value, sub, delta, spark, sparkColor }: {
  icon: any; tone: string; label: string; value: string; sub: string;
  delta?: React.ReactNode; spark?: number[] | null; sparkColor: string;
}) {
  const tones: Record<string, string> = {
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-500 border-red-200",
    orange: "bg-orange-50 text-orange-500 border-orange-200",
    gold: "bg-gold/10 text-gold border-gold/20",
  };
  const figure: Record<string, string> = {
    green: "text-green-700",
    red: "text-red-600",
    orange: "text-orange-600",
    gold: "text-gold",
  };
  return (
    <div className="bg-paper rounded-2xl border border-ink/10 p-5">
      <div className="flex items-start gap-3">
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border flex-shrink-0 ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-muted">{label}</div>
          <div className={`font-display text-2xl font-medium leading-tight mt-1 ${figure[tone]}`}>{value}</div>
        </div>
      </div>
      {delta}
      <div className="text-xs text-muted mt-1.5">{sub}</div>
      {spark && spark.length > 1 && <Spark values={spark} color={sparkColor} />}
    </div>
  );
}
