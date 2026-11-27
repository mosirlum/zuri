"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mascot, type Mood } from "./Mascot";
import { TOPICS, reply, topicForPath, type Lang, type Reply, type Topic } from "@/lib/helper-kb";
import { detectIntent, langOf } from "@/lib/helper-ai";

interface Msg {
  id: number;
  from: "bot" | "me";
  text: string;
  steps?: string[];
  lines?: string[];
  page?: { href: string; label: string };
  note?: string;
  chips?: { label: string; topic?: string; say?: string }[];
}

/* the browser's own speech tools; not every browser has them, so the buttons only show where they work */
interface Rec {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecClass = new () => Rec;
const recClass = (): RecClass | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecClass; webkitSpeechRecognition?: RecClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const canSpeakHere = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: the choice just is not remembered */ } };
const stored = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

const byId = (id: string): Topic | undefined => TOPICS.find((t) => t.id === id);

// the few words the screen itself needs, in both languages
const T = {
  hello: (n: string) => ({
    en: `Hi ${n}! I'm the Zuri helper. Ask me how to do anything in the system, ask which cars and drivers are free, or what needs attention. English or Swahili.`,
    sw: `Habari ${n}! Mimi ni msaidizi wa Zuri. Niulize jinsi ya kufanya chochote kwenye mfumo, magari na madereva gani wako huru, au nini kinahitaji umakini. Kiswahili au Kiingereza.`,
  }),
  mic: { en: " Tap the microphone to talk to me.", sw: " Bonyeza maikrofoni kuongea nami." },
  sub: { en: "Your Zuri helper", sw: "Msaidizi wako wa Zuri" },
  listening: { en: "listening…", sw: "nasikiliza…" },
  thinking: { en: "thinking…", sw: "nafikiri…" },
  speaking: { en: "speaking…", sw: "naongea…" },
  ask: { en: "Ask me anything…", sw: "Niulize chochote…" },
  hearing: { en: "Listening…", sw: "Nasikiliza…" },
  send: { en: "Send", sw: "Tuma" },
  bubble: { en: "Need a hand?", sw: "Msaada?" },
  open: { en: "Open", sw: "Fungua" },
  offline: { en: "I need the internet for that. The guides still work without it.", sw: "Kwa hilo nahitaji mtandao. Maelekezo ya kawaida yanafanya kazi hata bila mtandao." },
  micBlocked: { en: "The microphone is blocked. Allow it for this site in the browser (the lock icon next to the address), then tap the microphone again.", sw: "Maikrofoni imezuiwa. Iruhusu kwa tovuti hii kwenye kivinjari (alama ya kufuli karibu na anwani), kisha bonyeza maikrofoni tena." },
  micLang: { en: "This device cannot listen in that language. Switch the language chip and try again.", sw: "Kifaa hiki hakiwezi kusikiliza lugha hiyo. Badilisha chipu ya lugha ujaribu tena." },
  thisPage: { en: "Help with this page", sw: "Msaada wa ukurasa huu" },
};
const AREAS: { label: Record<Lang, string>; topic: string }[] = [
  { label: { en: "Bookings", sw: "Bookings" }, topic: "newbooking" },
  { label: { en: "Payments", sw: "Malipo" }, topic: "payment" },
  { label: { en: "Cars and drivers", sw: "Magari na madereva" }, topic: "availability" },
  { label: { en: "Documents expiring", sw: "Hati zinazoisha" }, topic: "compliance" },
];

/**
 * The Zuri helper robot: a round button in the corner that opens a small chat.
 * It answers "how do I…" questions from a built-in guide, answers live questions (which cars and drivers are free,
 * what needs attention, and for the owner how the month is going and who owes), and you can type or talk to it and it
 * can talk back. English or Swahili. Every time it is opened the chat starts fresh.
 */
export function Helper({ pages, name, isBoss }: { pages: string[]; name: string; isBoss: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const [bubble, setBubble] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [canListen, setCanListen] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [vlang, setVlang] = useState<Lang>("sw");
  const [speakOn, setSpeakOn] = useState(false);
  const next = useRef(1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const rec = useRef<Rec | null>(null);
  const askRef = useRef<(text: string, topicId?: string, viaVoice?: boolean) => void>(() => {});

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    setCanListen(!!recClass());
    setCanSpeak(canSpeakHere());
    setVlang(stored("zh_vlang") === "en" ? "en" : "sw");
    setSpeakOn(stored("zh_speak") === "1");
  }, []);

  const flash = useCallback((m: Mood, ms = 3500) => {
    setMood(m);
    later(() => setMood("idle"), ms);
  }, [later]);

  /* ---------------------------------------------------------------- talking back */
  const stopSpeaking = useCallback(() => {
    if (canSpeakHere()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);
  const speak = useCallback((text: string, lang: Lang) => {
    if (!canSpeakHere()) return;
    window.speechSynthesis.cancel();
    const code = lang === "sw" ? "sw-TZ" : "en-US";
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().replace("_", "-").startsWith(lang));
    // short pieces: some browsers cut a long utterance off
    const parts = text.replace(/[“”"]/g, "").replace(/\s+/g, " ").match(/[^.!?:;]+[.!?:;]?/g)?.map((x) => x.trim()).filter(Boolean) ?? [text];
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = code;
      if (voice) u.voice = voice;
      if (i === 0) u.onstart = () => setSpeaking(true);
      if (i === parts.length - 1) { u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false); }
      window.speechSynthesis.speak(u);
    });
  }, []);

  /* ---------------------------------------------------------------- the chat */
  const closePanel = useCallback(() => {
    rec.current?.abort();
    setListening(false);
    stopSpeaking();
    setOpen(false);
    setMsgs([]); // every opening starts fresh
    setQ("");
    setThinking(false);
  }, [stopSpeaking]);

  // the first time it opens: say hello and offer what people ask most (and help for the page they are on)
  useEffect(() => {
    if (!open || msgs.length) return;
    const l = vlang;
    const here = topicForPath(path);
    const chips: NonNullable<Msg["chips"]> = [];
    if (here) chips.push({ label: T.thisPage[l], topic: here.id });
    chips.push(
      { label: l === "sw" ? "Magari na madereva sasa" : "Cars and drivers now", say: l === "sw" ? "magari na madereva gani wako huru" : "which cars and drivers are free" },
      { label: l === "sw" ? "Nini kinahitaji umakini?" : "What needs attention?", say: l === "sw" ? "nini kinahitaji umakini leo" : "what needs attention today" },
    );
    if (isBoss) chips.push(
      { label: l === "sw" ? "Chambua mwezi huu" : "Analyze this month", say: l === "sw" ? "chambua biashara ya mwezi huu" : "analyze how my business is doing this month" },
      { label: l === "sw" ? "Nani anadaiwa?" : "Who still owes?", say: l === "sw" ? "nani anadaiwa" : "who still owes us" },
    );
    for (const id of ["newbooking", "payment"]) if (id !== here?.id) chips.push({ label: byId(id)?.title[l] ?? id, topic: id });
    setMsgs([{ id: next.current++, from: "bot", text: T.hello(name)[l] + (recClass() ? T.mic[l] : ""), chips: chips.slice(0, 7) }]);
    flash("wink", 3000);
  }, [open, msgs.length, name, path, flash, isBoss, vlang]);

  // while closed: now and then wave, wink and say "need a hand?" so people notice it is there
  useEffect(() => {
    if (open) return;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      setBubble(true);
      setMood("wink");
      later(() => { setBubble(false); setMood("idle"); }, 4200);
      later(loop, 70000);
    };
    later(loop, 9000);
    return () => { alive = false; };
  }, [open, later]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePanel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePanel]);

  const fromReply = (r: Reply, lang: Lang): Msg => ({
    id: next.current++,
    from: "bot",
    text: r.text,
    steps: r.steps,
    page: r.page,
    note: r.note,
    chips: r.kind === "none" ? AREAS.map((a) => ({ label: a.label[lang], topic: a.topic })) : r.related.map((t) => ({ label: t.title[lang], topic: t.id })),
  });

  const ask = async (text: string, topicId?: string, viaVoice = false) => {
    const t = text.trim();
    if (!t || thinking) return;
    stopSpeaking();
    setMsgs((m) => [...m, { id: next.current++, from: "me", text: t }]);
    setQ("");
    setThinking(true);
    setMood("think");
    const wait = new Promise<void>((res) => later(res, 650));
    let msg: Msg;
    let m: Mood = "happy";
    const topic = topicId ? byId(topicId) : undefined;
    let lang: Lang = topic ? vlang : langOf(t);
    if (!topic && detectIntent(t) !== "none") {
      try {
        const res = await fetch("/api/admin/helper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) });
        const j = (await res.json()) as { kind: string; lang?: Lang; text?: string; lines?: string[]; page?: { href: string; label: string } };
        if (j.lang) lang = j.lang;
        if (j.kind === "none") {
          const r = reply(t, pages, lang);
          msg = fromReply(r, lang);
          m = r.mood;
        } else {
          msg = { id: next.current++, from: "bot", text: j.text ?? "", lines: j.lines, page: j.page };
          m = j.kind === "error" || j.kind === "deny" ? "sad" : "happy";
        }
      } catch {
        msg = { id: next.current++, from: "bot", text: T.offline[lang] };
        m = "sad";
      }
    } else {
      const r = topic ? reply(`${topic.title[lang]} ${topic.keys[0] ?? ""}`, pages, lang) : reply(t, pages, lang);
      msg = fromReply(r, lang);
      m = r.mood;
    }
    await wait;
    setMsgs((x) => [...x, msg]);
    setThinking(false);
    flash(m, m === "sad" ? 6000 : 4500);
    if (speakOn || viaVoice) speak([msg.text, ...(msg.lines ?? []), ...(msg.steps ?? [])].join(". "), lang);
  };
  askRef.current = ask;

  /* ---------------------------------------------------------------- listening */
  const listen = () => {
    if (listening) { rec.current?.stop(); return; }
    const C = recClass();
    if (!C || thinking) return;
    stopSpeaking();
    const r = new C();
    r.lang = vlang === "sw" ? "sw-TZ" : "en-US";
    r.interimResults = true;
    r.continuous = false;
    let said = "";
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const tr0 = last?.[0]?.transcript ?? "";
      said = tr0;
      setQ(tr0);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setMsgs((m) => [...m, { id: next.current++, from: "bot", text: T.micBlocked[vlang] }]);
      else if (e.error === "language-not-supported") setMsgs((m) => [...m, { id: next.current++, from: "bot", text: T.micLang[vlang] }]);
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
      if (said.trim()) askRef.current(said, undefined, true);
    };
    rec.current = r;
    setListening(true);
    setMood("think");
    try { r.start(); } catch { setListening(false); }
  };

  const toggleSpeak = () => {
    const v = !speakOn;
    setSpeakOn(v);
    store("zh_speak", v ? "1" : "0");
    if (!v) stopSpeaking();
  };
  const toggleLang = () => {
    const v: Lang = vlang === "en" ? "sw" : "en";
    setVlang(v);
    store("zh_vlang", v);
  };

  const face: Mood = thinking || listening ? "think" : speaking ? "happy" : mood;
  return (
    <div className="hm-root">
      {open ? (
        <div className="hm-panel" role="dialog" aria-label="Zuri helper">
          <div className="hm-head">
            <div className="hm-face"><Mascot mood={face} size={44} /></div>
            <div className="hm-title">
              <b>Zuri</b>
              <span>{listening ? T.listening[vlang] : thinking ? T.thinking[vlang] : speaking ? T.speaking[vlang] : T.sub[vlang]}</span>
            </div>
            {canSpeak ? (
              <button type="button" className={`hm-ic${speakOn ? " on" : ""}`} onClick={toggleSpeak} aria-pressed={speakOn} aria-label={speakOn ? "Turn the voice off" : "Turn the voice on"} title={speakOn ? "Voice answers: on" : "Voice answers: off"}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 9v6h4l5 4V5L8 9H4z" />
                  {speakOn ? <><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></> : <path d="M17 9l5 6M22 9l-5 6" />}
                </svg>
              </button>
            ) : null}
            <button type="button" className="hm-x" onClick={closePanel} aria-label="Close">×</button>
          </div>
          <div className="hm-msgs" ref={box}>
            {msgs.map((m) => (
              <div key={m.id} className={`hm-msg hm-${m.from}`}>
                <div className="hm-text">{m.text}</div>
                {m.lines ? <ul className="hm-lines">{m.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
                {m.steps ? <ol className="hm-steps">{m.steps.map((s, i) => <li key={i}>{s}</li>)}</ol> : null}
                {m.page ? <Link className="hm-go" href={m.page.href} onClick={closePanel}>{`${T.open[vlang]} ${m.page.label} →`}</Link> : null}
                {m.note ? <div className="hm-note">{m.note}</div> : null}
                {m.chips?.length ? (
                  <div className="hm-chips">
                    {m.chips.map((c) => <button key={c.label} type="button" className="hm-chip" onClick={() => ask(c.say ?? c.label, c.say ? undefined : c.topic)}>{c.label}</button>)}
                  </div>
                ) : null}
              </div>
            ))}
            {thinking ? <div className="hm-msg hm-bot"><div className="hm-text hm-typing"><i /><i /><i /></div></div> : null}
          </div>
          <form className="hm-form" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
            {canListen ? (
              <button type="button" className={`hm-ic hm-mic${listening ? " on" : ""}`} onClick={listen} aria-pressed={listening} aria-label={listening ? "Stop listening" : "Talk to the helper"} title="Talk to me">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
            ) : null}
            <button type="button" className="hm-vl" onClick={toggleLang} title="Language" aria-label={`Language: ${vlang === "en" ? "English" : "Swahili"}`}>{vlang === "en" ? "EN" : "SW"}</button>
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={listening ? T.hearing[vlang] : T.ask[vlang]} aria-label="Your question" autoComplete="off" />
            <button type="submit" disabled={!q.trim() || thinking}>{T.send[vlang]}</button>
          </form>
        </div>
      ) : null}
      {!open && bubble ? <button type="button" className="hm-bubble" onClick={() => { setBubble(false); setOpen(true); }}>{T.bubble[vlang]}</button> : null}
      <button type="button" className="hm-fab" onClick={() => { if (open) closePanel(); else { setOpen(true); setBubble(false); setTimeout(() => input.current?.focus(), 60); } }} aria-label={open ? "Close the helper" : "Open the helper"} aria-expanded={open}>
        <Mascot mood={open ? "happy" : mood} size={52} />
      </button>
    </div>
  );
}
