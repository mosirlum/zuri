"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Lock, Calendar,
  Clock, Minus, Receipt, Wallet, PieChart, ChevronRight, ChevronLeft,
} from "lucide-react";
import { useSession } from "next-auth/react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type FilterMode = "custom" | "week" | "month" | "year" | "all";

const MONTHLY_CATEGORIES = [
  { value: "office_rent", label: "Kodi ya Jengo (Rent)" },
  { value: "office_electricity", label: "Umeme (Electricity)" },
  { value: "office_water", label: "Maji (Water)" },
  { value: "office_security", label: "Security" },
  { value: "office_wifi", label: "Wifi / Internet" },
  { value: "driver_salary", label: "Driver Salaries" },
  { value: "office_maintenance", label: "Office Maintenance" },
  { value: "office_stationery", label: "Stationery" },
  { value: "other_monthly", label: "Other Monthly" },
];

const PERIODIC_CATEGORIES = [
  { value: "insurance_premium", label: "Insurance Premium" },
  { value: "license_renewal", label: "Operating Licence" },
  { value: "road_worthiness", label: "Road Worthiness Certificate" },
  { value: "vat_service_levy", label: "VAT / Kodi ya Huduma" },
  { value: "tax", label: "Annual Tax" },
  { value: "safari_yetu", label: "Safari Yetu Ticket" },
  { value: "maintenance", label: "Maintenance / Repair" },
  { value: "other_periodic", label: "Other Periodic" },
];

const TRIP_CATEGORIES = [
  { value: "fuel", label: "Fuel" },
  { value: "driver_salary", label: "Driver Allowance" },
  { value: "other", label: "Trip Other" },
];

const ALL_CATEGORIES = [...MONTHLY_CATEGORIES, ...PERIODIC_CATEGORIES, ...TRIP_CATEGORIES];

const getCategoryLabel = (value: string) =>
  ALL_CATEGORIES.find(c => c.value === value)?.label ||
  (value || "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

const PERIOD_OPTIONS = [
  { value: 1, label: "Every month" },
  { value: 3, label: "Every 3 months (quarterly)" },
  { value: 6, label: "Every 6 months" },
  { value: 12, label: "Every year" },
  { value: 24, label: "Every 2 years" },
];

const money = (n: number) => Math.round(n).toLocaleString();

const DONUT_COLORS = ["#b8843a", "#1c1814", "#c2410c", "#0f766e", "#7e22ce", "#a16207", "#9f1239", "#166534"];

function getWeekRange(year: number, week: number) {
  const jan1 = new Date(year, 0, 1);
  const daysToMonday = jan1.getDay() === 0 ? -6 : 1 - jan1.getDay();
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + daysToMonday);
  const start = new Date(firstMonday);
  start.setDate(firstMonday.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

// ── ADD EXPENSE ──────────────────────────────────────────────────
function AddExpenseForm({ onClose, onSave, initialType }: {
  onClose: () => void; onSave: () => void; initialType?: "monthly" | "periodic";
}) {
  const [expenseType, setExpenseType] = useState<"monthly" | "periodic">(initialType || "monthly");
  const [category, setCategory] = useState("office_rent");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [periodMonths, setPeriodMonths] = useState(1);
  const [nextDueDate, setNextDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expenseType === "monthly") setCategory("office_rent");
    else setCategory("insurance_premium");
  }, [expenseType]);

  useEffect(() => {
    if (expenseDate && periodMonths && expenseType === "periodic") {
      const date = new Date(expenseDate);
      date.setMonth(date.getMonth() + periodMonths);
      setNextDueDate(date.toISOString().split("T")[0]);
    }
  }, [expenseDate, periodMonths, expenseType]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category, description, amount: parseFloat(amount),
        currency: "TZS", expense_date: expenseDate,
        expense_type: expenseType,
        period_months: expenseType === "periodic" ? periodMonths : 1,
        next_due_date: expenseType === "periodic" ? nextDueDate : null,
      }),
    });
    setSaving(false);
    onSave();
  };

  const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
  const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";
  const categories = expenseType === "monthly" ? MONTHLY_CATEGORIES : PERIODIC_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <h2 className="font-display text-xl font-medium">Add Expense</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className={lbl}>Expense Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setExpenseType("monthly")}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                  expenseType === "monthly" ? "bg-ink text-paper border-ink" : "bg-paper text-muted border-ink/15 hover:border-ink/30"
                }`}>
                <div className="font-semibold">Monthly Fixed</div>
                <div className="text-xs opacity-70 mt-0.5">Rent, Umeme, Salary</div>
              </button>
              <button onClick={() => setExpenseType("periodic")}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                  expenseType === "periodic" ? "bg-ink text-paper border-ink" : "bg-paper text-muted border-ink/15 hover:border-ink/30"
                }`}>
                <div className="font-semibold">Periodic</div>
                <div className="text-xs opacity-70 mt-0.5">Insurance, Licence, Tax</div>
              </button>
            </div>
          </div>

          <div>
            <label className={lbl}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold">
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Description *</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              autoComplete="off" className={inp}
              placeholder={expenseType === "monthly" ? "Umeme — January 2026" : "Insurance renewal — all vehicles"} />
          </div>

          <div>
            <label className={lbl}>Amount (TZS) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inp} placeholder="0" />
          </div>

          <div>
            <label className={lbl}>{expenseType === "monthly" ? "Month of" : "Date Paid"}</label>
            <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className={inp} />
          </div>

          {expenseType === "periodic" && (
            <>
              <div>
                <label className={lbl}>How often does this recur?</label>
                <select value={periodMonths} onChange={e => setPeriodMonths(parseInt(e.target.value))}
                  className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold">
                  {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Next Due Date</label>
                <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} className={inp} />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={saving || !description || !amount}
            className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
            {saving ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Delta({ current, previous, label, lowerIsBetter = false }: {
  current: number; previous: number; label: string; lowerIsBetter?: boolean;
}) {
  if (!previous) return null;
  const diff = current - previous;
  const pct = Math.round((diff / Math.abs(previous)) * 100);
  if (pct === 0) {
    return <div className="flex items-center gap-1 text-[0.7rem] text-muted mt-2"><Minus className="w-3 h-3" /> same as {label}</div>;
  }
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <div className={`flex items-center gap-1 text-[0.7rem] mt-2 font-medium ${good ? "text-green-600" : "text-red-500"}`}>
      <Icon className="w-3 h-3" />
      {pct > 0 ? "+" : ""}{pct}% <span className="text-muted font-normal">vs {label}</span>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function FinancePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"monthly" | "periodic">("monthly");
  const [tab, setTab] = useState<"all" | "trip" | "monthly" | "periodic">("all");
  const [trendMode, setTrendMode] = useState<"month" | "sixMonths" | "year">("month");

  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const years = [2024, 2025, 2026, 2027];

  useEffect(() => {
    if (role === "super_admin") fetchData();
    else setLoading(false);
  }, [role]);

  const fetchData = async () => {
    const [eRes, bRes] = await Promise.all([
      fetch("/api/admin/expenses"),
      fetch("/api/admin/bookings"),
    ]);
    const e = await eRes.json();
    const b = await bRes.json();
    setAllExpenses(Array.isArray(e) ? e : []);
    setAllBookings(Array.isArray(b) ? b : []);
    setLoading(false);
  };

  const getDateRange = useCallback((): { start: Date; end: Date } | null => {
    if (filterMode === "all") return null;
    if (filterMode === "custom") {
      if (!customStart || !customEnd) return null;
      return { start: new Date(customStart), end: new Date(customEnd + "T23:59:59") };
    }
    if (filterMode === "week") {
      const { start, end } = getWeekRange(selectedYear, selectedWeek);
      end.setHours(23, 59, 59);
      return { start, end };
    }
    if (filterMode === "month") {
      return {
        start: new Date(selectedYear, selectedMonth, 1),
        end: new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59),
      };
    }
    return { start: new Date(selectedYear, 0, 1), end: new Date(selectedYear, 11, 31, 23, 59, 59) };
  }, [filterMode, selectedYear, selectedMonth, selectedWeek, customStart, customEnd]);

  const range = getDateRange();

  const within = (items: any[], field: string, r: { start: Date; end: Date } | null) =>
    items.filter(item => {
      if (!r) return true;
      const d = new Date(item[field]);
      return d >= r.start && d <= r.end;
    });

  // Revenue is recognised when the invoice is written, matching Reports —
  // waiting for payment would understate months where corporate clients
  // haven't settled yet.
  const invoicedBookings = allBookings.filter(b => b.invoice_number && parseFloat(b.paid_amount) > 0);

  const slice = (r: { start: Date; end: Date } | null) => {
    const trip = within(allExpenses.filter(e => e.booking_id), "expense_date", r);
    const monthly = within(allExpenses.filter(e => !e.booking_id && e.expense_type === "monthly"), "expense_date", r);
    const periodic = within(allExpenses.filter(e => !e.booking_id && (e.expense_type === "periodic" || !e.expense_type)), "expense_date", r);
    const books = within(invoicedBookings, "pickup_datetime", r);
    const revenue = books.reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);
    const tripCost = trip.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const monthlyCost = monthly.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const periodicCost = periodic.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const expenses = tripCost + monthlyCost + periodicCost;
    return { trip, monthly, periodic, books, revenue, tripCost, monthlyCost, periodicCost, expenses, net: revenue - expenses };
  };

  const cur = slice(range);

  // Previous comparable period, so the cards can show movement.
  const prevRange = (() => {
    if (!range || filterMode === "all" || filterMode === "custom") return null;
    if (filterMode === "month") {
      const m = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const y = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59), label: `${MONTHS[m]} ${y}` };
    }
    if (filterMode === "year") {
      return { start: new Date(selectedYear - 1, 0, 1), end: new Date(selectedYear - 1, 11, 31, 23, 59, 59), label: `${selectedYear - 1}` };
    }
    const w = selectedWeek === 1 ? 52 : selectedWeek - 1;
    const y = selectedWeek === 1 ? selectedYear - 1 : selectedYear;
    const { start, end } = getWeekRange(y, w);
    end.setHours(23, 59, 59);
    return { start, end, label: `week ${w}` };
  })();

  const prev = prevRange ? slice(prevRange) : null;

  const tripCount = cur.books.length;
  const avgCostPerTrip = tripCount > 0 ? cur.tripCost / tripCount : 0;
  const prevAvg = prev && prev.books.length > 0 ? prev.tripCost / prev.books.length : 0;

  // ── cash flow trend ───────────────────────────────────────────
  // Running totals rather than per-day amounts: money lands in lumps here, so
  // what matters is how the period builds up, not which single day was busy.
  const trendPoints = (() => {
    if (trendMode === "month") {
      const from = range ? range.start : new Date(selectedYear, selectedMonth, 1);
      const to = range ? range.end : new Date(selectedYear, selectedMonth + 1, 0);
      const out: { label: string; revenue: number; expenses: number; net: number }[] = [];
      let rev = 0, exp = 0;
      const d = new Date(from);
      while (d <= to) {
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        const s = slice({ start: dayStart, end: dayEnd });
        rev += s.revenue;
        exp += s.expenses;
        out.push({
          label: `${d.getDate()} ${d.toLocaleDateString("en-TZ", { month: "short" })}`,
          revenue: rev, expenses: exp, net: rev - exp,
        });
        d.setDate(d.getDate() + 1);
      }
      return out;
    }

    if (trendMode === "year") {
      let rev = 0, exp = 0;
      return Array.from({ length: 12 }, (_, i) => {
        const s = slice({
          start: new Date(selectedYear, i, 1),
          end: new Date(selectedYear, i + 1, 0, 23, 59, 59),
        });
        rev += s.revenue;
        exp += s.expenses;
        return { label: MONTHS[i].slice(0, 3), revenue: rev, expenses: exp, net: rev - exp };
      });
    }

    // Rolling six months, each point the total to that date.
    let rev = 0, exp = 0;
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(selectedYear, selectedMonth - (5 - i), 1);
      const s = slice({
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      });
      rev += s.revenue;
      exp += s.expenses;
      return { label: d.toLocaleDateString("en-TZ", { month: "short" }), revenue: rev, expenses: exp, net: rev - exp };
    });
  })();

  const trend = trendPoints;

  const compact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `${Math.round(n / 1_000)}K`;
    return String(Math.round(n));
  };

  // Round the axis out to a clean 1 / 2 / 5 step so the labels read as money.
  const niceStep = (roughStep: number) => {
    const pow = Math.pow(10, Math.floor(Math.log10(roughStep || 1)));
    const norm = (roughStep || 1) / pow;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return step * pow;
  };

  const TW = 320, TH = 130;
  const trendValues = trend.flatMap(t => [t.revenue, t.expenses, t.net]);
  const rawMax = Math.max(...trendValues, 0);
  const rawMin = Math.min(...trendValues, 0);
  const step = niceStep((rawMax - rawMin || 1) / 4);
  const yMax = Math.ceil((rawMax || 1) / step) * step;
  const yMin = Math.floor(rawMin / step) * step;

  const axisTicks: number[] = [];
  for (let v = yMax; v >= yMin - 0.0001; v -= step) axisTicks.push(Math.round(v));

  const yOf = (v: number) => TH - ((v - yMin) / ((yMax - yMin) || 1)) * TH;
  const xOf = (i: number) => trend.length <= 1 ? 0 : (i / (trend.length - 1)) * TW;
  const zeroY = yOf(0);

  const linePts = (key: "revenue" | "expenses" | "net") =>
    trend.map((t, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(t[key]).toFixed(1)}`).join(" ");

  const areaPts = (key: "revenue" | "expenses" | "net") =>
    `${linePts(key)} L${TW},${zeroY} L0,${zeroY} Z`;

  const hasTrendData = trendValues.some(v => v !== 0);

  // Too many days to label them all, so show roughly six spread across.
  const labelEvery = Math.max(1, Math.ceil(trend.length / 6));

  // ── categories ────────────────────────────────────────────────
  const catTotals: Record<string, number> = {};
  [...cur.trip, ...cur.monthly, ...cur.periodic].forEach(e => {
    const key = e.category || "other";
    catTotals[key] = (catTotals[key] || 0) + parseFloat(e.amount || 0);
  });
  const cats = Object.entries(catTotals)
    .map(([key, amount], i) => ({ key, amount, label: getCategoryLabel(key), color: DONUT_COLORS[i % DONUT_COLORS.length] }))
    .sort((a, b) => b.amount - a.amount);

  let donutOffset = 0;
  const donut = cats.map(c => {
    const pct = cur.expenses > 0 ? (c.amount / cur.expenses) * 100 : 0;
    const arc = { ...c, pct, offset: donutOffset };
    donutOffset += pct;
    return arc;
  });

  // ── transactions ──────────────────────────────────────────────
  const rows = (() => {
    const mark = (list: any[], type: string) => list.map(e => ({ ...e, _type: type }));
    if (tab === "trip") return mark(cur.trip, "Trip");
    if (tab === "monthly") return mark(cur.monthly, "Fixed");
    if (tab === "periodic") return mark(cur.periodic, "Periodic");
    return [...mark(cur.trip, "Trip"), ...mark(cur.monthly, "Fixed"), ...mark(cur.periodic, "Periodic")]
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  })();

  const upcomingPeriodic = allExpenses
    .filter(e => e.next_due_date && e.expense_type === "periodic")
    .map(e => ({ ...e, daysUntilDue: Math.ceil((new Date(e.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) }))
    .filter(e => e.daysUntilDue <= 60)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const periodLabel = (() => {
    if (filterMode === "all") return "All Time";
    if (filterMode === "custom") return customStart && customEnd ? `${customStart} to ${customEnd}` : "Custom Range";
    if (filterMode === "week") {
      const { start, end } = getWeekRange(selectedYear, selectedWeek);
      return `Week ${selectedWeek} · ${start.toLocaleDateString("en-TZ",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("en-TZ",{day:"numeric",month:"short"})}`;
    }
    if (filterMode === "month") return `${MONTHS[selectedMonth]} ${selectedYear}`;
    return `Full Year ${selectedYear}`;
  })();

  const stepMonth = (dir: number) => {
    let m = selectedMonth + dir, y = selectedYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setSelectedMonth(m); setSelectedYear(y); setFilterMode("month");
  };

  if (!loading && role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-20 h-20 rounded-full bg-ink/5 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted" />
        </div>
        <h2 className="font-display text-2xl font-medium text-ink mb-2">Finance is Private</h2>
        <p className="text-muted text-sm max-w-xs">This section is only accessible to the business owner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink">
            Finance <em className="italic text-gold">Overview</em>
          </h1>
          <p className="text-muted text-sm mt-1">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {filterMode === "month" && (
            <div className="flex items-center border border-ink/15 rounded-xl overflow-hidden">
              <button onClick={() => stepMonth(-1)} className="px-2 py-2.5 text-muted hover:text-ink hover:bg-ink/5">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm text-ink whitespace-nowrap">{MONTHS[selectedMonth]} {selectedYear}</span>
              <button onClick={() => stepMonth(1)} className="px-2 py-2.5 text-muted hover:text-ink hover:bg-ink/5">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <button onClick={() => { setFormType("monthly"); setShowForm(true); }}
            className="flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-gold hover:text-ink transition-colors rounded-xl">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="bg-paper rounded-2xl border border-ink/10 p-4 flex items-center gap-3 flex-wrap">
        <Calendar className="w-4 h-4 text-muted" />
        {(["week","month","year","all","custom"] as FilterMode[]).map(m => (
          <button key={m} onClick={() => setFilterMode(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMode === m ? "bg-ink text-paper" : "bg-paper-soft text-muted hover:text-ink border border-ink/10"
            }`}>
            {m === "all" ? "All Time" : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}

        {filterMode === "week" && (
          <>
            <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))}
              className="border border-ink/15 bg-paper text-ink px-3 py-1.5 rounded-lg text-xs outline-none focus:border-gold">
              {Array.from({ length: 52 }, (_, i) => <option key={i+1} value={i+1}>Week {i+1}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="border border-ink/15 bg-paper text-ink px-3 py-1.5 rounded-lg text-xs outline-none focus:border-gold">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
        {filterMode === "year" && (
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="border border-ink/15 bg-paper text-ink px-3 py-1.5 rounded-lg text-xs outline-none focus:border-gold">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {filterMode === "custom" && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="border border-ink/15 bg-paper text-ink px-3 py-1.5 rounded-lg text-xs outline-none focus:border-gold" />
            <span className="text-xs text-muted">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="border border-ink/15 bg-paper text-ink px-3 py-1.5 rounded-lg text-xs outline-none focus:border-gold" />
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm animate-pulse">Loading finance...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} tone="green" label="Total Revenue"
              value={`TZS ${money(cur.revenue)}`} sub={`${tripCount} trips invoiced`}>
              {prev && prevRange && <Delta current={cur.revenue} previous={prev.revenue} label={prevRange.label} />}
            </StatCard>

            <StatCard icon={Receipt} tone="amber" label="Total Expenses"
              value={`TZS ${money(cur.expenses)}`} sub={`${cur.trip.length + cur.monthly.length + cur.periodic.length} records`}>
              {prev && prevRange && <Delta current={cur.expenses} previous={prev.expenses} label={prevRange.label} lowerIsBetter />}
            </StatCard>

            <StatCard icon={DollarSign} tone={cur.net >= 0 ? "gold" : "red"} label="Net Result"
              value={`${cur.net < 0 ? "-" : ""}TZS ${money(Math.abs(cur.net))}`}
              sub={cur.net >= 0 ? "Profit this period" : "Loss this period"}>
              {prev && prevRange && <Delta current={cur.net} previous={prev.net} label={prevRange.label} />}
            </StatCard>

            <StatCard icon={Wallet} tone="ink" label="Avg Cost per Trip"
              value={`TZS ${money(avgCostPerTrip)}`} sub={`across ${tripCount} trips`}>
              {prevAvg > 0 && prevRange && <Delta current={avgCostPerTrip} previous={prevAvg} label={prevRange.label} lowerIsBetter />}
            </StatCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend */}
            <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden lg:col-span-2">
              <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-display text-xl font-medium">Cash Flow Trend</h2>
                <select value={trendMode} onChange={e => setTrendMode(e.target.value as any)}
                  className="border border-ink/15 bg-paper text-ink px-3 py-1.5 rounded-lg text-xs outline-none focus:border-gold">
                  <option value="month">This period, day by day</option>
                  <option value="sixMonths">Last 6 months</option>
                  <option value="year">Full year {selectedYear}</option>
                </select>
              </div>

              <div className="px-6 pt-4 pb-5">
                <div className="flex items-center gap-4 text-xs mb-4">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-600" />Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Expenses</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gold" />Net</span>
                </div>

                {!hasTrendData ? (
                  <p className="text-sm text-muted text-center py-16">Nothing recorded in this period.</p>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <div className="flex flex-col justify-between text-[0.65rem] text-muted text-right w-12 flex-shrink-0" style={{ height: "190px" }}>
                        {axisTicks.map((v, i) => (
                          <span key={i} className={v === 0 ? "text-ink/60 font-medium" : ""}>{compact(v)}</span>
                        ))}
                      </div>

                      <svg viewBox={`0 0 ${TW} ${TH}`} className="w-full" style={{ height: "190px" }} preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
                          </linearGradient>
                          <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        {axisTicks.map((v, i) => (
                          <line key={i} x1="0" y1={yOf(v)} x2={TW} y2={yOf(v)}
                            stroke="currentColor"
                            className={v === 0 ? "text-ink/25" : "text-ink/[0.07]"}
                            strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        ))}

                        <path d={areaPts("expenses")} fill="url(#expFill)" />
                        <path d={areaPts("revenue")} fill="url(#revFill)" />

                        <path d={linePts("expenses")} fill="none" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        <path d={linePts("net")} fill="none" stroke="#b8843a" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        <path d={linePts("revenue")} fill="none" stroke="#16a34a" strokeWidth="2" vectorEffect="non-scaling-stroke" />

                        {trend.map((t, i) => (
                          <g key={i}>
                            <circle cx={xOf(i)} cy={yOf(t.expenses)} r="2.5" fill="#ef4444" vectorEffect="non-scaling-stroke" />
                            <circle cx={xOf(i)} cy={yOf(t.net)} r="2.5" fill="#b8843a" vectorEffect="non-scaling-stroke" />
                            <circle cx={xOf(i)} cy={yOf(t.revenue)} r="2.5" fill="#16a34a" vectorEffect="non-scaling-stroke" />
                          </g>
                        ))}
                      </svg>
                    </div>

                    <div className="relative mt-2 ml-[3.75rem] h-4">
                      {trend.map((t, i) => (
                        i % labelEvery === 0 || i === trend.length - 1 ? (
                          <span key={i}
                            className="absolute text-[0.65rem] text-muted -translate-x-1/2 whitespace-nowrap"
                            style={{ left: `${trend.length <= 1 ? 0 : (i / (trend.length - 1)) * 100}%` }}>
                            {t.label}
                          </span>
                        ) : null
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-ink/10">
                      <div>
                        <div className="text-xs text-muted">Revenue</div>
                        <div className="font-display text-lg font-medium text-green-600">
                          {money(trend[trend.length - 1]?.revenue || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">Expenses</div>
                        <div className="font-display text-lg font-medium text-red-500">
                          {money(trend[trend.length - 1]?.expenses || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">Net</div>
                        <div className={`font-display text-lg font-medium ${
                          (trend[trend.length - 1]?.net || 0) >= 0 ? "text-gold" : "text-red-600"
                        }`}>
                          {money(trend[trend.length - 1]?.net || 0)}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Category donut */}
            <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-gold" />
                <h2 className="font-display text-xl font-medium">By Category</h2>
              </div>
              <div className="p-6">
                {cur.expenses === 0 ? (
                  <p className="text-sm text-muted text-center py-8">No expenses in this period.</p>
                ) : (
                  <>
                    <div className="relative w-32 h-32 mx-auto mb-5">
                      <svg viewBox="0 0 42 42" className="-rotate-90 w-full h-full">
                        <circle cx="21" cy="21" r="15.9155" fill="none" stroke="currentColor" className="text-ink/5" strokeWidth="4" />
                        {donut.map(d => (
                          <circle key={d.key} cx="21" cy="21" r="15.9155" fill="none"
                            stroke={d.color} strokeWidth="4"
                            strokeDasharray={`${d.pct} ${100 - d.pct}`}
                            strokeDashoffset={-d.offset} />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-base font-medium text-ink leading-none">{money(cur.expenses)}</span>
                        <span className="text-[0.55rem] text-muted uppercase tracking-widest mt-1">TZS total</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {donut.slice(0, 6).map(d => (
                        <div key={d.key} className="flex items-center gap-2 text-xs">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-ink-soft flex-1 truncate">{d.label}</span>
                          <span className="text-ink font-medium whitespace-nowrap">{money(d.amount)}</span>
                          <span className="text-muted w-9 text-right">{Math.round(d.pct)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transactions */}
            <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden lg:col-span-2">
              <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2 flex-wrap">
                {([
                  { k: "all", l: "All" },
                  { k: "trip", l: "Trip" },
                  { k: "monthly", l: "Fixed" },
                  { k: "periodic", l: "Periodic" },
                ] as const).map(t => (
                  <button key={t.k} onClick={() => setTab(t.k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tab === t.k ? "bg-ink text-paper" : "bg-paper-soft text-muted border border-ink/10 hover:border-ink/30"
                    }`}>
                    {t.l}
                  </button>
                ))}
                <span className="ml-auto text-xs text-muted">{rows.length} entries</span>
              </div>

              {rows.length === 0 ? (
                <div className="px-6 py-12 text-center text-muted text-sm">No expenses in this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-ink/10 bg-paper-soft">
                        {["Date","Description","Category","Reference","Type","Amount"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs tracking-widest uppercase text-muted font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {rows.map((e, i) => (
                        <tr key={i} className="hover:bg-paper-soft transition-colors">
                          <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                            {new Date(e.expense_date).toLocaleDateString("en-TZ", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3 text-sm text-ink">{e.description}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-lg bg-paper-soft border border-ink/10 text-ink-soft whitespace-nowrap">
                              {getCategoryLabel(e.category)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-gold whitespace-nowrap">{e.booking_ref || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap ${
                              e._type === "Trip" ? "bg-blue-50 text-blue-700"
                                : e._type === "Fixed" ? "bg-purple-50 text-purple-700"
                                : "bg-amber-50 text-amber-700"
                            }`}>{e._type}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-500 whitespace-nowrap">
                            -{money(parseFloat(e.amount || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Side column */}
            <div className="space-y-6">
              <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-ink/10">
                  <h2 className="font-display text-xl font-medium">Summary</h2>
                </div>
                <div className="divide-y divide-ink/5">
                  <Row label="Revenue" value={`TZS ${money(cur.revenue)}`} tone="text-green-600" />
                  <Row label="Trip costs" value={`TZS ${money(cur.tripCost)}`} tone="text-red-500" />
                  <Row label="Fixed costs" value={`TZS ${money(cur.monthlyCost)}`} tone="text-red-500" />
                  <Row label="Periodic costs" value={`TZS ${money(cur.periodicCost)}`} tone="text-red-500" />
                </div>
                <div className={`px-6 py-4 flex justify-between items-center border-t-2 ${
                  cur.net >= 0 ? "border-gold bg-gold/5" : "border-red-400 bg-red-50"
                }`}>
                  <span className="text-sm font-semibold text-ink">{cur.net >= 0 ? "Net Profit" : "Net Loss"}</span>
                  <span className={`font-display text-xl font-bold ${cur.net >= 0 ? "text-gold" : "text-red-600"}`}>
                    {cur.net < 0 ? "-" : "+"}TZS {money(Math.abs(cur.net))}
                  </span>
                </div>
                <div className="px-6 py-3 border-t border-ink/5">
                  <Link href="/admin/reports" className="text-xs text-gold hover:underline flex items-center gap-1">
                    Full financial report <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {upcomingPeriodic.length > 0 && (
                <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
                  <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gold" />
                    <h2 className="font-display text-xl font-medium">Coming Due</h2>
                  </div>
                  <div className="divide-y divide-ink/5">
                    {upcomingPeriodic.slice(0, 5).map((e, i) => (
                      <div key={i} className="px-6 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink truncate">{getCategoryLabel(e.category)}</p>
                          <p className="text-xs text-muted">{new Date(e.next_due_date).toLocaleDateString("en-TZ", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                          e.daysUntilDue <= 0 ? "bg-red-100 text-red-600"
                            : e.daysUntilDue <= 14 ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {e.daysUntilDue <= 0 ? "Due" : `${e.daysUntilDue}d`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-ink/10">
                  <h2 className="font-display text-xl font-medium">Quick Actions</h2>
                </div>
                <div className="p-4 space-y-2">
                  <button onClick={() => { setFormType("monthly"); setShowForm(true); }}
                    className="w-full flex items-center gap-3 rounded-xl border border-ink/10 bg-paper-soft px-4 py-3 text-left transition-all hover:border-gold/40 hover:bg-gold/5">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gold/10 text-gold">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-ink">Add Fixed Expense</span>
                      <span className="block text-xs text-muted">Rent, umeme, salaries</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </button>

                  <button onClick={() => { setFormType("periodic"); setShowForm(true); }}
                    className="w-full flex items-center gap-3 rounded-xl border border-ink/10 bg-paper-soft px-4 py-3 text-left transition-all hover:border-gold/40 hover:bg-gold/5">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gold/10 text-gold">
                      <Receipt className="w-4 h-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-ink">Add Periodic Expense</span>
                      <span className="block text-xs text-muted">Insurance, licence, tax</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </button>

                  <Link href="/admin/bookings"
                    className="w-full flex items-center gap-3 rounded-xl border border-ink/10 bg-paper-soft px-4 py-3 text-left transition-all hover:border-gold/40 hover:bg-gold/5">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gold/10 text-gold">
                      <Wallet className="w-4 h-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-ink">Trip Costs</span>
                      <span className="block text-xs text-muted">Recorded with each invoice</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <AddExpenseForm initialType={formType} onClose={() => setShowForm(false)}
          onSave={() => { fetchData(); setShowForm(false); }} />
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="px-6 py-3 flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-medium ${tone}`}>{value}</span>
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, value, sub, children }: {
  icon: any; tone: string; label: string; value: string; sub: string; children?: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    green: "bg-green-50 text-green-600 border-green-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    gold: "bg-gold/10 text-gold border-gold/20",
    red: "bg-red-50 text-red-600 border-red-200",
    ink: "bg-ink/5 text-ink border-ink/10",
  };
  // The figure carries the same colour as its icon — money in green, money out
  // in red — so the four cards can be read at a glance instead of one by one.
  const figure: Record<string, string> = {
    green: "text-green-600",
    amber: "text-red-500",
    gold: "text-gold",
    red: "text-red-600",
    ink: "text-ink",
  };
  return (
    <div className="bg-paper rounded-2xl border border-ink/10 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </span>
        <span className="text-sm text-muted">{label}</span>
      </div>
      <div className={`font-display text-2xl font-medium leading-none ${figure[tone] || "text-ink"}`}>{value}</div>
      <div className="text-xs text-muted mt-1.5">{sub}</div>
      {children}
    </div>
  );
}
