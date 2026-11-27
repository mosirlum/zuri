/**
 * The knowledge behind the Zuri helper robot. No AI service and no per-use cost: questions are matched on the device
 * against this list, so it works offline and never slows a page down. Questions can be typed or spoken in English or
 * Swahili, and the answer comes back in the language of the question.
 */
import type { Mood } from "@/components/Mascot";

export type Lang = "en" | "sw";
type L = Record<Lang, string>;

export interface Topic {
  id: string;
  title: L;
  /** words or short phrases that mean this topic, in English and Swahili */
  keys: string[];
  answer: L;
  steps?: Record<Lang, string[]>;
  /** the page that does it, shown as an "Open" button when the person's menu has it */
  page?: string;
  pageLabel?: string;
}

export const TOPICS: Topic[] = [
  {
    id: "newbooking",
    title: { en: "How do I add a booking?", sw: "Naongezaje booking mpya?" },
    keys: ["new booking", "add booking", "create booking", "make a booking", "book a car", "booking mpya", "ongeza booking", "weka booking", "kuhifadhi gari", "customer anataka gari", "new job", "kazi mpya"],
    answer: {
      en: "Every job starts as a booking. One booking is one job, and it later gets one invoice.",
      sw: "Kila kazi huanza kama booking. Booking moja ni kazi moja, na baadaye inapata ankara moja.",
    },
    steps: {
      en: [
        "Open Bookings and press New Booking.",
        "Fill in the customer, the service type, pickup and drop-off places and the dates.",
        "Add the car and the driver. If either is already booked on those dates, a warning tells you before you save.",
        "Save. The booking shows on the Dashboard and the car and driver count as busy for those dates.",
      ],
      sw: [
        "Fungua Bookings kisha bonyeza New Booking.",
        "Jaza mteja, aina ya huduma, mahali pa kuchukua na kushusha, na tarehe.",
        "Weka gari na dereva. Kama mmoja wao ameshapangiwa tarehe hizo, onyo linakuja kabla ya kuhifadhi.",
        "Hifadhi. Booking inaonekana kwenye Dashboard na gari na dereva wanahesabiwa kuwa wana kazi kwa tarehe hizo.",
      ],
    },
    page: "/admin/bookings",
    pageLabel: "Bookings",
  },
  {
    id: "assign",
    title: { en: "Put a car and driver on a trip", sw: "Kumpangia gari na dereva safari" },
    keys: ["assign driver", "assign car", "assign vehicle", "driver for trip", "change driver", "swap driver", "double booking", "already booked", "mpangie dereva", "weka dereva", "badilisha dereva", "dereva wa safari", "gari na dereva", "amepangiwa", "imepangiwa"],
    answer: {
      en: "Cars and drivers are chosen inside the booking. Open the booking, press Edit and change the car or the driver. A car or driver who is already booked on the same dates is flagged as a double booking, so you can pick another one.",
      sw: "Gari na dereva huchaguliwa ndani ya booking. Fungua booking, bonyeza Edit kisha ubadilishe gari au dereva. Gari au dereva aliyeshapangiwa tarehe hizo anawekewa alama ya double booking, ili uchague mwingine.",
    },
    page: "/admin/bookings",
    pageLabel: "Bookings",
  },
  {
    id: "payment",
    title: { en: "Record a payment", sw: "Kurekodi malipo" },
    keys: ["payment", "record payment", "customer paid", "mark as paid", "received money", "deposit", "malipo", "amelipa", "alilipa", "rekodi malipo", "weka malipo", "nimepokea", "pesa imeingia", "mpesa", "cash", "bank transfer"],
    answer: {
      en: "Payments are recorded on the booking, never on a separate page, so the money always sits next to the job it belongs to.",
      sw: "Malipo hurekodiwa kwenye booking yenyewe, si ukurasa mwingine, ili pesa iwe karibu na kazi inayohusika.",
    },
    steps: {
      en: [
        "Open Bookings and open the job the customer paid for.",
        "Press Payment (or Mark as Paid when the whole amount came in).",
        "Choose the method (Cash, M-Pesa or Bank Transfer), the amount and the date received.",
        "Save. The balance still owed updates by itself.",
      ],
      sw: [
        "Fungua Bookings kisha ufungue kazi ambayo mteja amelipia.",
        "Bonyeza Payment (au Mark as Paid kama pesa yote imeingia).",
        "Chagua njia (Cash, M-Pesa au Bank Transfer), kiasi na tarehe ya kupokea.",
        "Hifadhi. Salio linalodaiwa linajisasisha lenyewe.",
      ],
    },
    page: "/admin/bookings",
    pageLabel: "Bookings",
  },
  {
    id: "invoice",
    title: { en: "Make or print an invoice", sw: "Kutengeneza au kuchapa ankara" },
    keys: ["invoice", "invoices", "bill the customer", "send invoice", "print invoice", "ankara", "tengeneza ankara", "toa ankara", "chapa ankara", "uninvoiced", "haijatolewa ankara", "invoiced", "outstanding"],
    answer: {
      en: "One booking gets one invoice. Open the booking and press Invoice. Whether a job is invoiced, paid or overdue is worked out by the system from the dates and payments, so you never set it by hand. Print or save the documents from the same booking.",
      sw: "Booking moja inapata ankara moja. Fungua booking kisha bonyeza Invoice. Kama kazi imetolewa ankara, imelipwa au imechelewa, mfumo unahesabu wenyewe kutoka tarehe na malipo, hakuna haja ya kuiweka mwenyewe. Chapa au hifadhi hati kutoka booking hiyohiyo.",
    },
    page: "/admin/bookings",
    pageLabel: "Bookings",
  },
  {
    id: "cancel",
    title: { en: "Cancel or delete a booking", sw: "Kufuta au kughairi booking" },
    keys: ["cancel booking", "delete booking", "remove booking", "wrong booking", "customer cancelled", "ghairi", "futa booking", "ondoa booking", "mteja ameghairi", "booking mbaya", "kosa kwenye booking"],
    answer: {
      en: "Cancel keeps the record but frees the car and the driver straight away. Delete removes the booking and its linked expenses for good, so it asks you first. To fix a mistake, press Edit instead and correct it in place.",
      sw: "Cancel inabaki na kumbukumbu lakini inaachilia gari na dereva mara moja. Delete inaondoa booking na gharama zake kabisa, kwa hiyo inakuuliza kwanza. Kurekebisha kosa, bonyeza Edit na urekebishe papo hapo.",
    },
    page: "/admin/bookings",
    pageLabel: "Bookings",
  },
  {
    id: "tripcosts",
    title: { en: "Record fuel and trip costs", sw: "Kurekodi mafuta na gharama za safari" },
    keys: ["fuel", "trip cost", "trip costs", "allowance", "driver allowance", "parking", "toll", "mafuta", "gharama za safari", "posho", "posho ya dereva", "gharama ya trip", "vehicle cost", "gharama za gari"],
    answer: {
      en: "Costs of a trip (fuel, driver allowance, parking and similar) are recorded on that booking under Trip Costs. They count against that job, so its real profit is always visible. Company costs such as rent and salaries go in Finance instead.",
      sw: "Gharama za safari (mafuta, posho ya dereva, parking na kadhalika) hurekodiwa kwenye booking husika chini ya Trip Costs. Zinahesabiwa dhidi ya kazi hiyo, ili faida halisi ionekane. Gharama za kampuni kama kodi na mishahara huwekwa Finance.",
    },
    page: "/admin/bookings",
    pageLabel: "Bookings",
  },
  {
    id: "availability",
    title: { en: "Why is a car or driver shown as on a trip?", sw: "Kwa nini gari au dereva anaonekana yupo safarini?" },
    keys: ["available", "availability", "on trip", "on a trip", "who is free", "is free", "still on trip", "shown busy", "driver shows", "dereva yupo safarini", "yuko safarini", "anapatikana", "hapatikani", "safarini", "anaonekana", "yupo ofisini", "bado safarini", "gari liko safarini", "haipatikani", "why busy"],
    answer: {
      en: "Nobody sets this by hand. A car or driver counts as on a trip from the pickup time until the return time of a booking that is not cancelled. If no return time was recorded, they count as out for one day from pickup. To free them sooner, open the booking and fill in the real return time, or cancel it. A driver set to On Leave is never offered for bookings.",
      sw: "Hakuna anayeweka hili kwa mkono. Gari au dereva anahesabiwa yupo safarini kuanzia muda wa kuchukua hadi muda wa kurudi wa booking ambayo haijaghairiwa. Kama muda wa kurudi haukuwekwa, wanahesabiwa wapo nje kwa siku moja tangu kuchukua. Kuwaachilia mapema, fungua booking uweke muda halisi wa kurudi, au uighairi. Dereva aliyewekwa On Leave hapendekezwi kwenye bookings.",
    },
    page: "/admin/bookings",
    pageLabel: "Bookings",
  },
  {
    id: "fleet",
    title: { en: "Add a car or its photo", sw: "Kuongeza gari au picha yake" },
    keys: ["add vehicle", "add car", "new car", "new vehicle", "car photo", "vehicle photo", "picture of car", "upload photo", "fleet", "ongeza gari", "gari jipya", "picha ya gari", "weka picha", "pakia picha", "magari", "maintenance", "matengenezo", "service due", "plate"],
    answer: {
      en: "Cars live on the Fleet page, one card per car.",
      sw: "Magari yako kwenye ukurasa wa Fleet, kadi moja kwa kila gari.",
    },
    steps: {
      en: [
        "Open Fleet and press Add Vehicle. Enter the plate, category, seats and the document expiry dates.",
        "To add a photo, open the car's card and upload a picture. It is shrunk automatically.",
        "Set the status to Maintenance when the car is in the garage: it is then not offered for bookings.",
        "Edit or delete from the same card. Delete always asks first.",
      ],
      sw: [
        "Fungua Fleet kisha bonyeza Add Vehicle. Weka namba ya gari, aina, viti na tarehe za kuisha kwa hati.",
        "Kuweka picha, fungua kadi ya gari na upakie picha. Inapunguzwa ukubwa yenyewe.",
        "Weka hali ya Maintenance gari likiwa gereji: halitapendekezwa kwenye bookings.",
        "Hariri au futa kutoka kadi hiyohiyo. Kufuta daima kunakuuliza kwanza.",
      ],
    },
    page: "/admin/fleet",
    pageLabel: "Fleet",
  },
  {
    id: "drivers",
    title: { en: "Add a driver or put one on leave", sw: "Kuongeza dereva au kumpa likizo" },
    keys: ["add driver", "new driver", "driver leave", "on leave", "driver licence", "driver license", "psv", "good conduct", "uniform", "ongeza dereva", "dereva mpya", "dereva", "ongezaje", "likizo", "dereva yuko likizo", "leseni ya dereva", "madereva", "driver"],
    answer: {
      en: "Drivers live on the Drivers page. Add a driver with the licence number and the three expiry dates (licence, PSV badge, good conduct) so the system can warn you before any of them runs out. Set a driver to On Leave and they are not offered for bookings until you change it back.",
      sw: "Madereva wako kwenye ukurasa wa Drivers. Ongeza dereva pamoja na namba ya leseni na tarehe tatu za kuisha (leseni, PSV badge, good conduct) ili mfumo ukuonye kabla hazijaisha. Mweke dereva On Leave na hatapendekezwa kwenye bookings hadi umrudishe.",
    },
    page: "/admin/drivers",
    pageLabel: "Drivers",
  },
  {
    id: "compliance",
    title: { en: "Documents that are expiring", sw: "Hati zinazokaribia kuisha" },
    keys: ["compliance", "expiry", "expiring", "expire", "insurance", "licence expiry", "road worthiness", "tra sticker", "documents expiring", "hati", "inaisha", "zinaisha", "bima", "leseni inaisha", "ukaguzi", "sticker"],
    answer: {
      en: "The Compliance page lists every car and driver document that is expired or about to expire (Requiring Attention), what is coming up, and what is fine. Anything expiring within 14 days also shows on the Dashboard under what needs attention.",
      sw: "Ukurasa wa Compliance unaorodhesha kila hati ya gari na dereva iliyoisha au inayokaribia kuisha (Requiring Attention), inayokuja, na zile ziko sawa. Chochote kinachoisha ndani ya siku 14 pia kinaonekana kwenye Dashboard chini ya mambo yanayohitaji umakini.",
    },
    page: "/admin/compliance",
    pageLabel: "Compliance",
  },
  {
    id: "expenses",
    title: { en: "Record a company expense", sw: "Kurekodi matumizi ya kampuni" },
    keys: ["expense", "expenses", "add expense", "rent", "salary", "salaries", "umeme", "finance", "company cost", "overheads", "matumizi", "gharama", "kodi", "mshahara", "mishahara", "ongeza matumizi", "fedha", "periodic", "fixed expense"],
    answer: {
      en: "Company costs go in Finance (owner only) under Add Expense. There are three kinds: normal expenses, Monthly Fixed costs such as rent, umeme and salaries, and Periodic costs such as insurance, licences and tax with a next due date. Trip costs are different: they go on the booking itself.",
      sw: "Gharama za kampuni huwekwa Finance (mmiliki tu) chini ya Add Expense. Kuna aina tatu: matumizi ya kawaida, gharama za kila mwezi (Monthly Fixed) kama kodi, umeme na mishahara, na gharama za vipindi (Periodic) kama bima, leseni na kodi zenye tarehe ya kulipa tena. Gharama za safari ni tofauti: zinawekwa kwenye booking yenyewe.",
    },
    page: "/admin/finance",
    pageLabel: "Finance",
  },
  {
    id: "reports",
    title: { en: "See my profit and the report", sw: "Kuona faida na ripoti" },
    keys: ["report", "reports", "profit", "profit doctor", "loss", "margin", "monthly report", "analysis", "ripoti", "faida", "hasara", "uchambuzi", "ripoti ya mwezi", "print report", "pdf"],
    answer: {
      en: "Reports (owner only) writes the month for you: the money you keep from every TZS 100 earned, the money to win back, the jobs that lost money and what to fix first. Press Print / PDF on it to save or print a copy. You can also just ask me to analyze this month.",
      sw: "Reports (mmiliki tu) inaandika mwezi kwa ajili yako: pesa unayobaki nayo kwa kila TZS 100 uliyopata, pesa ya kurudisha, kazi zilizopoteza pesa na cha kurekebisha kwanza. Bonyeza Print / PDF kuhifadhi au kuchapa nakala. Unaweza pia kuniomba nichambue mwezi huu.",
    },
    page: "/admin/reports",
    pageLabel: "Reports",
  },
  {
    id: "growth",
    title: { en: "Is the business growing?", sw: "Biashara inakua?" },
    keys: ["growth", "business growth", "growing", "last month", "compare months", "direction", "forecast", "ukuaji", "inakua", "mwezi uliopita", "linganisha", "mwelekeo", "makadirio"],
    answer: {
      en: "Business Growth (owner only) compares this month with last month and the months before, shows which way profit is heading, and forecasts where the month will end. Every item on it opens the exact booking, car or customer.",
      sw: "Business Growth (mmiliki tu) inalinganisha mwezi huu na uliopita na iliyotangulia, inaonyesha faida inaelekea wapi, na kukadiria mwezi utaishia wapi. Kila kitu kilichopo kinafungua booking, gari au mteja husika.",
    },
    page: "/admin/growth",
    pageLabel: "Business Growth",
  },
  {
    id: "margin",
    title: { en: "Change the profit target", sw: "Kubadilisha lengo la faida" },
    keys: ["target margin", "profit target", "target", "goal", "lengo", "lengo la faida", "asilimia ya faida", "40%"],
    answer: {
      en: "The profit target (the share of every TZS 100 you want to keep) is set in Settings under Business. The default is 40%. Reports and Business Growth judge the month against it.",
      sw: "Lengo la faida (kiasi unachotaka kubaki nacho kwa kila TZS 100) huwekwa Settings chini ya Business. Chaguo-msingi ni 40%. Reports na Business Growth zinapima mwezi dhidi yake.",
    },
    page: "/admin/settings",
    pageLabel: "Settings",
  },
  {
    id: "users",
    title: { en: "Add a staff member or reset a password", sw: "Kuongeza mfanyakazi au kubadilisha nywila" },
    keys: ["add user", "new user", "add staff", "new staff", "reset password", "staff account", "who can sign in", "deactivate", "ongeza mtumiaji", "mfanyakazi mpya", "ongeza mfanyakazi", "weka nywila", "badilisha nywila ya mtu", "akaunti ya mfanyakazi", "users", "watumiaji", "activity log", "nani amebadilisha", "who changed"],
    answer: {
      en: "Staff accounts are managed in Users (owner only): add a person, reset their password, or switch the account off with Account is active. The same page shows the activity log, so you can see who changed what and when.",
      sw: "Akaunti za wafanyakazi zinasimamiwa Users (mmiliki tu): ongeza mtu, mwekee nywila mpya, au zima akaunti kwa Account is active. Ukurasa huohuo unaonyesha kumbukumbu ya shughuli, ili uone nani alibadilisha nini na lini.",
    },
    page: "/admin/users",
    pageLabel: "Users",
  },
  {
    id: "password",
    title: { en: "Change my own password", sw: "Kubadilisha nywila yangu" },
    keys: ["my password", "change password", "forgot password", "nywila yangu", "badilisha nywila", "nimesahau nywila", "password"],
    answer: {
      en: "Open Settings, find Password under Account, enter your current password and the new one twice, then save. If you forgot it, ask the owner to reset it in Users.",
      sw: "Fungua Settings, tafuta Password chini ya Account, weka nywila ya sasa na mpya mara mbili, kisha hifadhi. Kama umeisahau, mwombe mmiliki akuwekee nyingine kupitia Users.",
    },
    page: "/admin/settings",
    pageLabel: "Settings",
  },
  {
    id: "textsize",
    title: { en: "Make the writing bigger", sw: "Kukuza maandishi" },
    keys: ["text size", "bigger text", "bigger writing", "font size", "too small", "cannot read", "glasses", "zoom", "maandishi madogo", "kukuza maandishi", "andiko kubwa", "herufi kubwa", "siwezi kusoma", "miwani", "mwandiko"],
    answer: {
      en: "At the bottom of the left menu, under your name, there are three A buttons: normal, large and extra large. Your choice is remembered on this device, so everything stays that size next time.",
      sw: "Chini ya menyu ya kushoto, chini ya jina lako, kuna vitufe vitatu vya A: kawaida, kubwa na kubwa zaidi. Chaguo lako linakumbukwa kwenye kifaa hiki, kwa hiyo maandishi yanabaki hivyo wakati ujao.",
    },
  },
  {
    id: "print",
    title: { en: "Print or save as PDF", sw: "Kuchapa au kuhifadhi PDF" },
    keys: ["print", "pdf", "save as pdf", "download", "printer", "chapa", "chapisha", "hifadhi pdf", "pakua", "documents", "hati za booking", "quotation", "receipt", "risiti"],
    answer: {
      en: "Open the booking and press Print documents to print its documents. The report on the Reports page has its own Print / PDF button. In the print window choose Save as PDF if you want a file.",
      sw: "Fungua booking na bonyeza Print documents kuchapa hati zake. Ripoti ya kwenye Reports ina kitufe chake cha Print / PDF. Kwenye dirisha la kuchapa chagua Save as PDF kama unataka faili.",
    },
    page: "/admin/bookings",
    pageLabel: "Bookings",
  },
  {
    id: "communication",
    title: { en: "Message a customer", sw: "Kumtumia mteja ujumbe" },
    keys: ["whatsapp", "sms", "email", "message customer", "contact customer", "communication", "ujumbe", "mtumie mteja", "wasiliana", "mawasiliano", "barua pepe"],
    answer: {
      en: "The Communication page has quick WhatsApp actions, with SMS and email in one place, so you can reach a customer without leaving the system.",
      sw: "Ukurasa wa Communication una vitendo vya haraka vya WhatsApp, pamoja na SMS na barua pepe mahali pamoja, ili umfikie mteja bila kutoka kwenye mfumo.",
    },
    page: "/admin/communication",
    pageLabel: "Communication",
  },
  {
    id: "about",
    title: { en: "What can you do?", sw: "Unaweza kufanya nini?" },
    keys: ["who are you", "your name", "what can you do", "help", "how to use", "jina lako", "nini unaweza", "unaweza nini", "msaada", "nisaidie", "saidia", "jinsi ya kutumia", "wewe nani"],
    answer: {
      en: "I'm the Zuri helper. Ask me how to do anything here, or ask live questions: which cars and drivers are free, what needs attention today, and (for the owner) how the month is going. I understand English and Swahili, and you can talk to me with the microphone.",
      sw: "Mimi ni msaidizi wa Zuri. Niulize jinsi ya kufanya chochote hapa, au maswali ya papo hapo: magari na madereva gani wako huru, nini kinahitaji umakini leo, na (kwa mmiliki) mwezi unaendeleaje. Naelewa Kiswahili na Kiingereza, na unaweza kuongea nami kwa maikrofoni.",
    },
  },
];

const GREET = ["hi", "hello", "hey", "habari", "mambo", "niaje", "salaam", "salam", "hujambo", "vipi", "sasa", "good morning", "good evening", "mambo vipi", "shikamoo", "hodi"];
const THANKS = ["thanks", "thank you", "asante", "shukran", "ahsante", "poa", "nice", "great", "safi", "good", "sawa"];
const BYE = ["bye", "goodbye", "kwaheri", "see you", "tutaonana"];

export interface Reply {
  kind: "answer" | "greet" | "thanks" | "bye" | "none";
  mood: Mood;
  text: string;
  steps?: string[];
  page?: { href: string; label: string };
  /** what the person may not open, and who can */
  note?: string;
  related: Topic[];
}

export function norm(s: string): string {
  return ` ${s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/-/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()} `;
}

function hit(q: string, key: string): boolean {
  const k = norm(key);
  // short keys must be whole words ("sms", "pdf"); longer ones also match inside a word ("invoices", "nimeuza")
  return k.trim().length >= 5 ? q.includes(k.trim()) : q.includes(k);
}

export function scoreTopics(query: string): { t: Topic; score: number }[] {
  const q = norm(query);
  const out: { t: Topic; score: number }[] = [];
  for (const t of TOPICS) {
    let score = 0;
    for (const key of t.keys) if (hit(q, key)) score += 2 + (key.includes(" ") ? 1 : 0);
    if (hit(q, t.title.en) || hit(q, t.title.sw)) score += 3;
    if (score > 0) out.push({ t, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

function wordsIn(q: string, list: string[]): boolean {
  return list.some((w) => q.includes(` ${w} `));
}

/** the topic that belongs to the page the person is on */
export function topicForPath(path: string): Topic | undefined {
  const best = TOPICS.filter((t) => t.page && t.page !== "/admin" && (path === t.page || path.startsWith(`${t.page}/`))).sort((a, b) => (b.page?.length ?? 0) - (a.page?.length ?? 0));
  return best[0];
}

export function reply(query: string, pages: string[], lang: Lang): Reply {
  const sw = lang === "sw";
  const q = norm(query);
  const ranked = scoreTopics(query);
  const top = ranked[0];
  if (!top || top.score < 2) {
    const short = q.trim().split(" ").length <= 4;
    if (short && wordsIn(q, BYE)) return { kind: "bye", mood: "wink", text: sw ? "Kwaheri! Rudi wakati wowote ukihitaji msaada." : "Bye! Come back any time you need a hand.", related: [] };
    if (short && wordsIn(q, THANKS)) return { kind: "thanks", mood: "happy", text: sw ? "Karibu sana! Nimefurahi kusaidia." : "You're welcome! Happy to help.", related: [] };
    if (short && wordsIn(q, GREET)) return { kind: "greet", mood: "wink", text: sw ? "Habari! Ungependa kufanya nini kwenye mfumo leo?" : "Hello! What would you like to do in the system today?", related: [] };
    return {
      kind: "none",
      mood: "sad",
      text: sw ? "Hmm, hilo sijalijua bado, na sitaki kubahatisha. Niambie zaidi: unajaribu kufanya nini, bookings, malipo, magari, madereva au pesa? Chagua hapa chini au liandike kwa maneno mengine." : "Hmm, I don't know that one yet, and I don't want to guess. Can you tell me more? What are you trying to do: bookings, payments, cars, drivers or money? Pick one below or write it in other words.",
      related: [],
    };
  }
  const t = top.t;
  const related = ranked.slice(1, 3).map((r) => r.t);
  let page: Reply["page"];
  let note: string | undefined;
  if (t.page) {
    if (pages.includes(t.page)) page = { href: t.page, label: t.pageLabel ?? t.title.en };
    else note = sw ? `${t.pageLabel ?? "Ukurasa huo"} hauko kwenye menyu yako. Kama unauhitaji, mwombe mmiliki.` : `${t.pageLabel ?? "That page"} is not in your menu. If you need it, ask the owner.`;
  }
  return { kind: "answer", mood: "happy", text: t.answer[lang], steps: t.steps?.[lang], page, note, related };
}
