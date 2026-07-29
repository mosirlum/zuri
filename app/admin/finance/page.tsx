"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, TrendingUp, TrendingDown, Plus, Lock, Calendar, RefreshCw, Clock } from "lucide-react";
import { useSession } from "next-auth/react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type FilterMode = "custom" | "week" | "month" | "year" | "all";

// ── EXPENSE CATEGORIES PER TYPE ──────────────────────────────────
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

const ALL_CATEGORIES = [...MONTHLY_CATEGORIES, ...PERIODIC_CATEGORIES];

const getCategoryLabel = (value: string) => {
  return ALL_CATEGORIES.find(c => c.value === value)?.label ||
    value.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};

const PERIOD_OPTIONS = [
  { value: 1, label: "Every month" },
  { value: 3, label: "Every 3 months (quarterly)" },
  { value: 6, label: "Every 6 months" },
  { value: 12, label: "Every year" },
  { value: 24, label: "Every 2 years" },
];

// ── DATE HELPERS ─────────────────────────────────────────────────
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

// ── ADD EXPENSE FORM ─────────────────────────────────────────────
function AddExpenseForm({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [expenseType, setExpenseType] = useState<"monthly" | "periodic">("monthly");
  const [category, setCategory] = useState("office_rent");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [periodMonths, setPeriodMonths] = useState(1);
  const [nextDueDate, setNextDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-set category when type changes
  useEffect(() => {
    if (expenseType === "monthly") setCategory("office_rent");
    else setCategory("insurance_premium");
  }, [expenseType]);

  // Auto-calculate next due date
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
          {/* Expense type selector */}
          <div>
            <label className={lbl}>Expense Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setExpenseType("monthly")}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                  expenseType === "monthly"
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper text-muted border-ink/15 hover:border-ink/30"
                }`}>
                <div className="font-semibold">📅 Monthly Fixed</div>
                <div className="text-xs opacity-70 mt-0.5">Rent, Umeme, Salary...</div>
              </button>
              <button onClick={() => setExpenseType("periodic")}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                  expenseType === "periodic"
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper text-muted border-ink/15 hover:border-ink/30"
                }`}>
                <div className="font-semibold">🗓️ Periodic</div>
                <div className="text-xs opacity-70 mt-0.5">Insurance, Licence, Tax...</div>
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={lbl}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold">
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Description *</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              autoComplete="off" className={inp}
              placeholder={expenseType === "monthly" ? "e.g. Umeme — January 2025" : "e.g. Insurance renewal — all vehicles"} />
          </div>

          {/* Amount */}
          <div>
            <label className={lbl}>Amount (TZS) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inp} placeholder="0" />
          </div>

          {/* Date */}
          <div>
            <label className={lbl}>{expenseType === "monthly" ? "Month of" : "Date Paid"}</label>
            <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className={inp} />
          </div>

          {/* Periodic options */}
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
                <label className={lbl}>Next Due Date (auto-calculated)</label>
                <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} className={inp} />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                💡 System will show this as a reminder when the next due date approaches.
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

// ── MAIN FINANCE PAGE ────────────────────────────────────────────
export default function FinancePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
    setAllExpenses(await eRes.json());
    setAllBookings(await bRes.json());
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
    return {
      start: new Date(selectedYear, 0, 1),
      end: new Date(selectedYear, 11, 31, 23, 59, 59),
    };
  }, [filterMode, selectedYear, selectedMonth, selectedWeek, customStart, customEnd]);

  const range = getDateRange();

  // Filter by date
  const filterByDate = (items: any[], dateField: string) =>
    items.filter(item => {
      if (!range) return true;
      const d = new Date(item[dateField]);
      return d >= range.start && d <= range.end;
    });

  // Separate expense types
  const periodExpenses = filterByDate(allExpenses.filter(e => !e.booking_id && (e.expense_type === "periodic" || !e.expense_type)), "expense_date");
  const monthlyExpenses = filterByDate(allExpenses.filter(e => !e.booking_id && e.expense_type === "monthly"), "expense_date");
  const tripExpenses = filterByDate(allExpenses.filter(e => e.booking_id), "expense_date");
  const completedBookings = filterByDate(allBookings.filter(b => b.status === "completed" && parseFloat(b.paid_amount) > 0), "pickup_datetime");

  const totalRevenue = completedBookings.reduce((s, b) => s + parseFloat(b.paid_amount||0), 0);
  const totalTripExp = tripExpenses.reduce((s, e) => s + parseFloat(e.amount||0), 0);
  const totalMonthlyExp = monthlyExpenses.reduce((s, e) => s + parseFloat(e.amount||0), 0);
  const totalPeriodicExp = periodExpenses.reduce((s, e) => s + parseFloat(e.amount||0), 0);
  const totalAllExp = totalTripExp + totalMonthlyExp + totalPeriodicExp;
  const netProfit = totalRevenue - totalAllExp;

  // Weekly breakdown
  const weeklyData = (() => {
    if (filterMode !== "month" && filterMode !== "year") return [];
    const weeks: { label: string; revenue: number; tripCost: number; monthly: number; periodic: number }[] = [];
    const startDate = filterMode === "month" ? new Date(selectedYear, selectedMonth, 1) : new Date(selectedYear, 0, 1);
    const endDate = filterMode === "month" ? new Date(selectedYear, selectedMonth + 1, 0) : new Date(selectedYear, 11, 31);
    let current = new Date(startDate);
    let weekNum = 1;
    while (current <= endDate) {
      const ws = new Date(current);
      const we = new Date(current);
      we.setDate(we.getDate() + 6);
      if (we > endDate) we.setTime(endDate.getTime());
      const inRange = (d: string) => { const dt = new Date(d); return dt >= ws && dt <= we; };
      weeks.push({
        label: `W${weekNum} (${ws.toLocaleDateString("en-TZ",{day:"numeric",month:"short"})})`,
        revenue: completedBookings.filter(b => inRange(b.pickup_datetime)).reduce((s,b) => s+parseFloat(b.paid_amount||0),0),
        tripCost: tripExpenses.filter(e => inRange(e.expense_date)).reduce((s,e) => s+parseFloat(e.amount||0),0),
        monthly: monthlyExpenses.filter(e => inRange(e.expense_date)).reduce((s,e) => s+parseFloat(e.amount||0),0),
        periodic: periodExpenses.filter(e => inRange(e.expense_date)).reduce((s,e) => s+parseFloat(e.amount||0),0),
      });
      current.setDate(current.getDate() + 7);
      weekNum++;
    }
    return weeks;
  })();

  // Upcoming periodic expenses
  const upcomingPeriodic = allExpenses
    .filter(e => e.next_due_date && e.expense_type === "periodic")
    .map(e => ({ ...e, daysUntilDue: Math.ceil((new Date(e.next_due_date).getTime() - Date.now()) / (1000*60*60*24)) }))
    .filter(e => e.daysUntilDue <= 60)
    .sort((a,b) => a.daysUntilDue - b.daysUntilDue);

  const periodLabel = (() => {
    if (filterMode === "all") return "All Time";
    if (filterMode === "custom") return customStart && customEnd ? `${customStart} to ${customEnd}` : "Custom Range";
    if (filterMode === "week") { const {start,end} = getWeekRange(selectedYear,selectedWeek); return `Week ${selectedWeek} · ${start.toLocaleDateString("en-TZ",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("en-TZ",{day:"numeric",month:"short",year:"numeric"})}`; }
    if (filterMode === "month") return `${MONTHS[selectedMonth]} ${selectedYear}`;
    return `Full Year ${selectedYear}`;
  })();

  if (!loading && role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-20 h-20 rounded-full bg-ink/5 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted" />
        </div>
        <h2 className="font-display text-2xl font-medium text-ink mb-2">Finance is Private</h2>
        <p className="text-muted text-sm max-w-xs">Only accessible to the business owner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink">
            Finance <em className="italic text-gold">Overview</em>
          </h1>
          <p className="text-muted text-sm mt-1">{periodLabel}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors rounded-xl">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-paper rounded-2xl border border-ink/10 p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Calendar className="w-4 h-4 text-muted" />
          <span className="text-xs tracking-widest uppercase text-muted font-medium">View by:</span>
          {(["all","week","month","year","custom"] as FilterMode[]).map(m => (
            <button key={m} onClick={() => setFilterMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMode === m ? "bg-ink text-paper" : "bg-paper-soft text-muted hover:text-ink border border-ink/10"
              }`}>
              {m === "all" ? "All Time" : m.charAt(0).toUpperCase()+m.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {filterMode === "week" && (
            <>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))} className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
                {Array.from({length:52},(_,i) => { const {start,end} = getWeekRange(selectedYear,i+1); return <option key={i+1} value={i+1}>Week {i+1} · {start.toLocaleDateString("en-TZ",{day:"numeric",month:"short"})} – {end.toLocaleDateString("en-TZ",{day:"numeric",month:"short"})}</option>; })}
              </select>
            </>
          )}
          {filterMode === "month" && (
            <>
              <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
                {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          {filterMode === "year" && (
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {filterMode === "custom" && (
            <>
              <div><label className="block text-xs text-muted mb-1">From</label><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold" /></div>
              <div><label className="block text-xs text-muted mb-1">To</label><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border border-ink/15 bg-paper text-ink px-3 py-2 rounded-lg text-sm outline-none focus:border-gold" /></div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm animate-pulse">Loading...</div>
      ) : (
        <>
          {/* Upcoming periodic alerts */}
          {upcomingPeriodic.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">Upcoming Periodic Expenses</span>
              </div>
              <div className="space-y-2">
                {upcomingPeriodic.map((e,i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-amber-800">{getCategoryLabel(e.category)} — {e.description}</span>
                    <span className={`font-semibold ${e.daysUntilDue <= 14 ? "text-red-600" : "text-amber-700"}`}>
                      Due in {e.daysUntilDue} days ({new Date(e.next_due_date).toLocaleDateString("en-TZ",{day:"numeric",month:"short",year:"numeric"})})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <TrendingUp className="w-5 h-5 text-green-600 mb-2" />
              <div className="font-display text-2xl font-medium text-green-700">{totalRevenue.toLocaleString()}</div>
              <div className="text-xs text-green-600 mt-1">Revenue · {completedBookings.length} trips · TZS</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <TrendingDown className="w-5 h-5 text-orange-500 mb-2" />
              <div className="font-display text-2xl font-medium text-orange-600">{totalTripExp.toLocaleString()}</div>
              <div className="text-xs text-orange-500 mt-1">⛽ Trip costs · fuel+allowance · TZS</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <RefreshCw className="w-5 h-5 text-red-500 mb-2" />
              <div className="font-display text-2xl font-medium text-red-600">{(totalMonthlyExp + totalPeriodicExp).toLocaleString()}</div>
              <div className="text-xs text-red-500 mt-1">📅 Fixed + periodic · TZS</div>
            </div>
            <div className={`border rounded-2xl p-5 ${netProfit >= 0 ? "bg-gold/10 border-gold/30" : "bg-red-100 border-red-300"}`}>
              <DollarSign className={`w-5 h-5 mb-2 ${netProfit >= 0 ? "text-gold" : "text-red-600"}`} />
              <div className={`font-display text-2xl font-medium ${netProfit >= 0 ? "text-gold" : "text-red-700"}`}>{Math.abs(netProfit).toLocaleString()}</div>
              <div className={`text-xs mt-1 font-semibold ${netProfit >= 0 ? "text-gold" : "text-red-600"}`}>
                {netProfit >= 0 ? "✓ Net Profit" : "✗ Net Loss"} · TZS
              </div>
            </div>
          </div>

          {/* Weekly breakdown */}
          {weeklyData.length > 0 && (
            <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-ink/10">
                <h2 className="font-display text-xl font-medium">Weekly Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ink/10 bg-paper-soft">
                      <th className="px-4 py-3 text-left text-xs tracking-widest uppercase text-muted">Week</th>
                      <th className="px-4 py-3 text-right text-xs tracking-widest uppercase text-muted">Revenue</th>
                      <th className="px-4 py-3 text-right text-xs tracking-widest uppercase text-muted">⛽ Trip Costs</th>
                      <th className="px-4 py-3 text-right text-xs tracking-widest uppercase text-muted">📅 Monthly</th>
                      <th className="px-4 py-3 text-right text-xs tracking-widests uppercase text-muted">🗓️ Periodic</th>
                      <th className="px-4 py-3 text-right text-xs tracking-widest uppercase text-muted">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {weeklyData.map((w,i) => {
                      const net = w.revenue - w.tripCost - w.monthly - w.periodic;
                      return (
                        <tr key={i} className="hover:bg-paper-soft">
                          <td className="px-4 py-3 text-sm font-medium text-ink">{w.label}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{w.revenue > 0 ? `+${w.revenue.toLocaleString()}` : "—"}</td>
                          <td className="px-4 py-3 text-sm text-right text-orange-500">{w.tripCost > 0 ? `-${w.tripCost.toLocaleString()}` : "—"}</td>
                          <td className="px-4 py-3 text-sm text-right text-red-400">{w.monthly > 0 ? `-${w.monthly.toLocaleString()}` : "—"}</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">{w.periodic > 0 ? `-${w.periodic.toLocaleString()}` : "—"}</td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${net >= 0 ? "text-gold" : "text-red-600"}`}>
                            {net === 0 ? "—" : `${net >= 0 ? "+" : ""}${net.toLocaleString()}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink/20 bg-paper-soft font-semibold">
                      <td className="px-4 py-3 text-sm">Total</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">+{totalRevenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-orange-500">-{totalTripExp.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-400">-{totalMonthlyExp.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">-{totalPeriodicExp.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${netProfit >= 0 ? "text-gold" : "text-red-600"}`}>
                        {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Three expense sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Trip expenses */}
            <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink/10 bg-orange-50">
                <h3 className="font-semibold text-ink">⛽ Trip Expenses</h3>
                <p className="text-xs text-muted mt-0.5">Fuel · Allowance · Emergency</p>
                <p className="text-lg font-bold text-orange-600 mt-1">-{totalTripExp.toLocaleString()} TZS</p>
              </div>
              <div className="divide-y divide-ink/5 max-h-64 overflow-y-auto">
                {tripExpenses.length === 0 ? (
                  <p className="px-5 py-6 text-center text-muted text-sm">No trip expenses in this period.</p>
                ) : tripExpenses.map((e,i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-ink">{e.description}</p>
                        <p className="text-xs text-gold font-mono">{e.booking_ref}</p>
                      </div>
                      <span className="text-xs font-semibold text-orange-500 whitespace-nowrap ml-2">-{parseFloat(e.amount).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly fixed */}
            <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink/10 bg-red-50">
                <h3 className="font-semibold text-ink">📅 Monthly Fixed</h3>
                <p className="text-xs text-muted mt-0.5">Rent · Umeme · Salaries · Security</p>
                <p className="text-lg font-bold text-red-600 mt-1">-{totalMonthlyExp.toLocaleString()} TZS</p>
              </div>
              <div className="divide-y divide-ink/5 max-h-64 overflow-y-auto">
                {monthlyExpenses.length === 0 ? (
                  <p className="px-5 py-6 text-center text-muted text-sm">No monthly expenses in this period.</p>
                ) : monthlyExpenses.map((e,i) => (
                  <div key={i} className="px-5 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-medium text-ink">{getCategoryLabel(e.category)}</p>
                      <p className="text-xs text-muted">{e.description}</p>
                    </div>
                    <span className="text-xs font-semibold text-red-500 whitespace-nowrap ml-2">-{parseFloat(e.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Periodic */}
            <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink/10 bg-purple-50">
                <h3 className="font-semibold text-ink">🗓️ Periodic</h3>
                <p className="text-xs text-muted mt-0.5">Insurance · Licences · Tax · Safari Yetu</p>
                <p className="text-lg font-bold text-purple-600 mt-1">-{totalPeriodicExp.toLocaleString()} TZS</p>
              </div>
              <div className="divide-y divide-ink/5 max-h-64 overflow-y-auto">
                {periodExpenses.length === 0 ? (
                  <p className="px-5 py-6 text-center text-muted text-sm">No periodic expenses in this period.</p>
                ) : periodExpenses.map((e,i) => (
                  <div key={i} className="px-5 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-medium text-ink">{getCategoryLabel(e.category)}</p>
                      <p className="text-xs text-muted">{e.description}</p>
                      {e.next_due_date && (
                        <p className="text-xs text-amber-600 mt-0.5">Next due: {new Date(e.next_due_date).toLocaleDateString("en-TZ",{day:"numeric",month:"short",year:"numeric"})}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-purple-500 whitespace-nowrap ml-2">-{parseFloat(e.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue list */}
          <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
              <h2 className="font-display text-xl font-medium">Revenue — Completed Trips</h2>
              <span className="text-xs text-muted">{completedBookings.length} trips</span>
            </div>
            <div className="divide-y divide-ink/5">
              {completedBookings.length === 0 ? (
                <p className="px-6 py-8 text-center text-muted text-sm">No revenue in this period.</p>
              ) : completedBookings.map((b,i) => {
                const profit = parseFloat(b.paid_amount||0) - parseFloat(b.trip_cost||0);
                return (
                  <div key={i} className="px-6 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{b.customer_name}</p>
                      <p className="text-xs text-muted capitalize">{b.service_type?.replace(/_/g," ")} · {b.booking_ref}
                        {b.pickup_datetime && ` · ${new Date(b.pickup_datetime).toLocaleDateString("en-TZ",{day:"numeric",month:"short",year:"numeric"})}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-green-600">+{parseFloat(b.paid_amount||0).toLocaleString()}</p>
                      <p className={`text-xs font-medium ${profit >= 0 ? "text-gold" : "text-red-500"}`}>
                        Trip P&L: {profit >= 0 ? "+" : ""}{profit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {showForm && <AddExpenseForm onClose={() => setShowForm(false)} onSave={() => { fetchData(); setShowForm(false); }} />}
    </div>
  );
}
