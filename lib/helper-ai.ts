/**
 * What the Zuri helper can do beyond answering "how do I…": answer live questions (which cars and drivers are free,
 * what needs attention, how the month is going, who still owes) in English or Swahili.
 * Pure functions, so they can be tested; the route (app/api/admin/helper) feeds them the numbers.
 * It only reads. It never changes a booking, a payment or anything else: spoken words are too easy to mishear for that.
 */
import { norm, type Lang } from "./helper-kb";

export type { Lang };
export type Intent = "availability" | "attention" | "analysis" | "owed" | "none";

const SW_WORDS = ["leo", "jana", "mwezi", "wiki", "faida", "hasara", "matumizi", "hali", "biashara", "naomba", "nipe", "ngapi", "gani", "kiasi", "uliopita", "huu", "hii", "ya", "na", "kwa", "gari", "magari", "dereva", "madereva", "wapi", "yupo", "wako", "zipo", "yuko", "huru", "safarini", "ofisini", "nani", "anadaiwa", "wanadaiwa", "deni", "madeni", "chambua", "uchambuzi", "kinahitaji", "umakini", "mambo", "nini", "kuna", "tunaendeleaje", "inaendeleaje", "sasa", "bado", "yote", "habari", "asante", "ahsante", "kwaheri", "poa", "hujambo", "shikamoo", "niaje", "maandishi", "madogo", "siwezi", "kusoma", "naongezaje", "nawezaje", "niwezaje", "nimesahau", "nywila", "malipo", "ankara", "mteja", "safari", "kuongeza", "anaonekana", "unaweza", "msaada", "nisaidie", "weka", "futa", "badilisha", "rekodi", "ongeza"];
const EN_WORDS = ["the", "how", "what", "which", "who", "today", "yesterday", "week", "month", "analysis", "analyze", "analyse", "this", "last", "and", "for", "much", "many", "did", "my", "business", "profit", "expenses", "is", "are", "can", "cars", "car", "drivers", "driver", "free", "available", "out", "trip", "owes", "owe", "unpaid", "attention", "needs", "doing", "of", "me", "show", "tell"];

/** Swahili if more of its words are Swahili than English. Defaults to English. */
export function langOf(text: string): Lang {
  const w = norm(text).trim().split(" ");
  const sw = w.filter((x) => SW_WORDS.includes(x)).length;
  const en = w.filter((x) => EN_WORDS.includes(x)).length;
  return sw > 0 && sw >= en ? "sw" : "en";
}

// "how do I…" style questions belong to the built-in guide, not to a live lookup
const ASK_WORDS = ["how do", "how can", "how to", "niwezaje", "nawezaje", "naongezaje", "narekodije", "jinsi ya", "namna ya", "why", "kwa nini", "what is", "ninaweza kuweka", "nitafanyaje"];
const CAR_WORDS = ["car", "cars", "vehicle", "vehicles", "fleet", "gari", "magari", "driver", "drivers", "dereva", "madereva"];
const STATE_WORDS = ["available", "free", "out", "on trip", "on a trip", "on the road", "in the office", "at the office", "where", "who is", "which", "how many", "status", "huru", "wapi", "ofisini", "safarini", "nani", "gani", "ngapi", "hali ya", "wamepungua", "anapatikana", "zinapatikana", "bado"];
const ATTENTION_WORDS = ["attention", "needs me", "what needs", "urgent", "alerts", "alert", "warnings", "what should i do", "priorities", "priority", "umakini", "kinahitaji", "yanahitaji", "kipaumbele", "onyo", "nifanye nini", "mambo ya leo", "kuna nini leo", "kuna tatizo", "any problems", "problems"];
const ANALYSIS_VERBS = ["analy", "chambua", "uchambuzi", "how is", "how are", "how am", "doing", "performance", "compare", "summary", "muhtasari", "linganisha", "inaendeleaje", "tunaendeleaje", "inakwendaje", "hali ya biashara", "mwezi huu", "this month", "last month", "mwezi uliopita"];
const ANALYSIS_SUBJECTS = ["business", "biashara", "profit", "faida", "hasara", "loss", "month", "mwezi", "revenue", "income", "mapato", "money", "pesa", "sales", "mauzo", "we ", "tunaendeleaje"];
const WHO_WORDS = ["who is on a trip", "who is out", "who is free", "who is available", "who is not available", "nani yuko safarini", "nani yupo safarini", "nani yuko nje", "nani yupo nje", "nani yuko huru", "nani yupo huru", "nani hayupo", "nani amepungua"];
const OWED_WORDS = ["owe", "owes", "owed", "unpaid", "outstanding", "who has not paid", "not paid", "debt", "debts", "receivable", "anadaiwa", "wanadaiwa", "deni", "madeni", "hajalipa", "hawajalipa", "wadaiwa", "bado hajalipa"];

export function detectIntent(text: string): Intent {
  const q = norm(text);
  const has = (list: string[]) => list.some((k) => q.includes(k.length <= 4 ? ` ${k.trim()} ` : k.trim()));
  if (ASK_WORDS.some((k) => q.includes(` ${k} `) || q.trimStart().startsWith(k))) return "none";
  if (has(OWED_WORDS)) return "owed";
  if (has(WHO_WORDS) || (has(CAR_WORDS) && has(STATE_WORDS))) return "availability";
  if (has(ATTENTION_WORDS)) return "attention";
  if (has(ANALYSIS_VERBS) && has(ANALYSIS_SUBJECTS)) return "analysis";
  return "none";
}

/* ------------------------------------------------------------------ availability */

export interface FleetState {
  /** name of the car or driver, plus what it is doing */
  name: string;
  state: "free" | "out" | "leaving" | "off";
  /** booking reference when out or leaving */
  ref?: string;
  /** when the current trip is due back (out) or leaves (leaving), already formatted */
  when?: string;
}

export function buildAvailability(lang: Lang, vehicles: FleetState[], drivers: FleetState[]): { title: string; lines: string[] } {
  const sw = lang === "sw";
  const L: string[] = [];
  const part = (rows: FleetState[], one: string, many: string, oneSw: string, manySw: string) => {
    const label = (n: number) => (sw ? (n === 1 ? oneSw : manySw) : n === 1 ? one : many);
    const free = rows.filter((r) => r.state === "free");
    const out = rows.filter((r) => r.state === "out");
    const leaving = rows.filter((r) => r.state === "leaving");
    const off = rows.filter((r) => r.state === "off");
    if (!rows.length) { L.push(sw ? `Hakuna ${manySw} waliosajiliwa bado.` : `No ${many} are registered yet.`); return; }
    L.push(sw
      ? `${label(rows.length)} ${rows.length} kwa jumla: ${free.length} huru, ${out.length} safarini${leaving.length ? `, ${leaving.length} wanaondoka leo` : ""}${off.length ? `, ${off.length} hawapatikani` : ""}.`
      : `${rows.length} ${label(rows.length)} in total: ${free.length} free, ${out.length} on a trip${leaving.length ? `, ${leaving.length} leaving today` : ""}${off.length ? `, ${off.length} unavailable` : ""}.`);
    if (free.length) L.push(`${sw ? "Huru sasa" : "Free now"}: ${free.map((r) => r.name).join(", ")}.`);
    if (out.length) L.push(`${sw ? "Safarini" : "On a trip"}: ${out.map((r) => `${r.name} (${r.ref ?? "?"}${r.when ? `, ${sw ? "anarudi" : "back"} ${r.when}` : ""})`).join(", ")}.`);
    if (leaving.length) L.push(`${sw ? "Wanaondoka leo" : "Leaving today"}: ${leaving.map((r) => `${r.name} (${r.ref ?? "?"}${r.when ? ` ${r.when}` : ""})`).join(", ")}.`);
    if (off.length) L.push(`${sw ? "Hawapatikani" : "Unavailable"}: ${off.map((r) => r.name).join(", ")}.`);
  };
  part(vehicles, "car", "cars", "Gari", "Magari");
  part(drivers, "driver", "drivers", "Dereva", "Madereva");
  return { title: sw ? "Magari na madereva sasa hivi" : "Cars and drivers right now", lines: L };
}

/* ------------------------------------------------------------------ attention */

export interface AttentionLite { tone: "bad" | "warn" | "info"; title: string; detail: string; href: string; cta: string }

export function buildAttention(lang: Lang, items: AttentionLite[], total: number): { title: string; lines: string[]; first?: { href: string; label: string } } {
  const sw = lang === "sw";
  if (!items.length) return { title: sw ? "Hakuna kinachohitaji umakini" : "Nothing needs attention", lines: [sw ? "Kila kitu kiko sawa kwa sasa: hakuna hati zinazoisha, madeni ya zamani wala mambo yaliyokwama." : "All clear for now: no expiring documents, no old debts and nothing stuck."] };
  const mark = (t: AttentionLite["tone"]) => (t === "bad" ? (sw ? "Haraka" : "Urgent") : t === "warn" ? (sw ? "Angalia" : "Watch") : "Info");
  const lines = items.slice(0, 6).map((i) => `${mark(i.tone)}: ${i.title}${i.detail ? `. ${i.detail}` : ""}`);
  if (total > 6) lines.push(sw ? `Na mengine ${total - 6} kwenye Dashboard.` : `And ${total - 6} more on the Dashboard.`);
  const f = items[0];
  return { title: sw ? `Mambo ${total} yanayohitaji umakini` : `${total} thing${total === 1 ? "" : "s"} need attention`, lines, first: f ? { href: f.href, label: f.cta } : undefined };
}

/* ------------------------------------------------------------------ the month and who owes (owner only) */

const tzs = (n: number) => `TZS ${Math.round(n).toLocaleString("en-US")}`;
const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

export interface MonthData {
  label: string;
  isCurrent: boolean;
  elapsed: number;
  days: number;
  target: number;
  revenue: number;
  vehicleCosts: number;
  companyCosts: number;
  net: number;
  margin: number;
  jobs: number;
  prevLabel: string;
  prevRevenue: number;
  prevNet: number;
  forecastNet: number | null;
  receivablesTotal: number;
  receivablesCount: number;
  oldest: { ref: string; customer: string; amount: number; age: number } | null;
  /** the biggest problems the Profit Doctor found, already worded */
  findings: string[];
}

export function buildMonth(lang: Lang, d: MonthData): { title: string; lines: string[] } {
  const sw = lang === "sw";
  const L: string[] = [];
  const title = sw ? `Uchambuzi wa ${d.label}${d.isCurrent ? ` (siku ${d.elapsed} kati ya ${d.days})` : ""}` : `Analysis of ${d.label}${d.isCurrent ? ` (day ${d.elapsed} of ${d.days})` : ""}`;
  if (d.revenue <= 0 && d.vehicleCosts + d.companyCosts <= 0) {
    L.push(sw ? "Bado hakuna mapato wala gharama zilizorekodiwa. Ankara na gharama zikishaingizwa, nitaandika uchambuzi." : "No revenue or costs are recorded yet. Once invoices and expenses are in, I will write the analysis.");
    return { title, lines: L };
  }
  const ch = pct(d.revenue, d.prevRevenue);
  const cmp = ch === null ? "" : ch >= 0 ? (sw ? `, juu ${ch}% kuliko ${d.prevLabel}` : `, up ${ch}% on ${d.prevLabel}`) : (sw ? `, chini ${-ch}% kuliko ${d.prevLabel}` : `, down ${-ch}% on ${d.prevLabel}`);
  L.push(sw ? `Mapato: ${tzs(d.revenue)} kutoka kazi ${d.jobs}${cmp}.` : `Revenue: ${tzs(d.revenue)} from ${d.jobs} job${d.jobs === 1 ? "" : "s"}${cmp}.`);
  L.push(sw ? `Gharama: ${tzs(d.vehicleCosts)} za safari na magari, ${tzs(d.companyCosts)} za kampuni.` : `Costs: ${tzs(d.vehicleCosts)} on trips and cars, ${tzs(d.companyCosts)} company costs.`);
  const m = Math.round(d.margin);
  const verdict = d.net >= 0
    ? (sw ? `Faida: ${tzs(d.net)}. Unabaki na TZS ${m} kwa kila TZS 100, lengo lako ni ${d.target}%${m >= d.target ? ", uko juu ya lengo." : ", uko chini ya lengo."}` : `Profit: ${tzs(d.net)}. You keep TZS ${m} of every TZS 100, against your ${d.target}% target${m >= d.target ? ", so you are above target." : ", so you are below target."}`)
    : (sw ? `Hasara: ${tzs(-d.net)}. Gharama zimezidi mapato mwezi huu.` : `Loss: ${tzs(-d.net)}. Costs are higher than revenue this month.`);
  L.push(verdict);
  if (d.prevNet !== 0 && d.net !== d.prevNet) L.push(sw ? `Faida ${d.prevLabel}: ${tzs(d.prevNet)}.` : `Profit in ${d.prevLabel}: ${tzs(d.prevNet)}.`);
  if (d.forecastNet !== null && d.isCurrent) L.push(sw ? `Kwa kasi hii, mwezi unaweza kuishia na ${d.forecastNet >= 0 ? `faida ya ${tzs(d.forecastNet)}` : `hasara ya ${tzs(-d.forecastNet)}`}.` : `At this pace the month could end with ${d.forecastNet >= 0 ? `a profit of ${tzs(d.forecastNet)}` : `a loss of ${tzs(-d.forecastNet)}`}.`);
  if (d.receivablesTotal > 0) L.push(sw ? `Bado inadaiwa: ${tzs(d.receivablesTotal)} kwenye ankara ${d.receivablesCount}.` : `Still owed: ${tzs(d.receivablesTotal)} on ${d.receivablesCount} invoice${d.receivablesCount === 1 ? "" : "s"}.`);
  for (const f of d.findings.slice(0, 3)) L.push(f);
  return { title, lines: L };
}

export function buildOwed(lang: Lang, total: number, count: number, items: { ref: string; customer: string; amount: number; age: number }[]): { title: string; lines: string[] } {
  const sw = lang === "sw";
  if (count === 0 || total <= 0) return { title: sw ? "Hakuna deni" : "Nobody owes you", lines: [sw ? "Ankara zote zilizotolewa zimelipwa." : "Every invoice that has been issued is paid."] };
  const lines = [sw ? `Jumla inayodaiwa: ${tzs(total)} kwenye ankara ${count}.` : `Total owed: ${tzs(total)} on ${count} invoice${count === 1 ? "" : "s"}.`];
  for (const i of items.slice(0, 5)) lines.push(sw ? `${i.ref}, ${i.customer || "mteja"}: ${tzs(i.amount)}, siku ${i.age} tangu ankara.` : `${i.ref}, ${i.customer || "customer"}: ${tzs(i.amount)}, ${i.age} day${i.age === 1 ? "" : "s"} since invoice.`);
  lines.push(sw ? "Ushauri: wapigie simu wa zamani zaidi leo na mkubaliane tarehe ya kulipa." : "Advice: call the oldest ones today and agree a payment date.");
  return { title: sw ? "Nani anadaiwa" : "Who still owes", lines };
}
