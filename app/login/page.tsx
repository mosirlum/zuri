"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

// Login for Zuri Tours & Car Hire. Layout and styles live in ./login.css and
// match the approved design; everything is scoped under .zl so nothing leaks
// into the rest of the app.

const KEY = "zuri-remember-email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PALM = (
  <>
    <path d="M100 420c4-90 2-170-8-250l6-1c11 80 13 160 9 251h-7Z" />
    <path d="M96 172c-30-34-66-44-96-34 28-2 60 10 90 38l6-4Zm2-2c-4-46-30-78-62-92 24 18 44 50 56 94l6-2Zm2 0c18-40 50-62 86-64-30 10-58 34-80 68l-6-4Zm-2 4c40-18 78-14 104 6-30-12-66-10-100 0l-4-6Zm-6 2c-38 2-70 22-86 52 20-24 50-42 88-46l-2-6Z" />
  </>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [msg, setMsg] = useState<{ text: string; kind: "err" | "info" } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) { setEmail(saved); setRemember(true); }
    } catch { /* storage blocked */ }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const em = email.trim();
    const next: { email?: string; password?: string } = {};
    if (!em) next.email = "Please enter your email address.";
    else if (!EMAIL_RE.test(em)) next.email = "Please enter a valid email address.";
    if (!password) next.password = "Please enter your password.";
    setErrors(next);
    if (next.email || next.password) {
      document.getElementById(next.email ? "email" : "password")?.focus();
      return;
    }

    try {
      if (remember) localStorage.setItem(KEY, em); else localStorage.removeItem(KEY);
    } catch { /* storage blocked */ }

    setLoading(true);
    try {
      const result = await signIn("credentials", { email: em, password, redirect: false });
      if (result?.error) {
        setMsg({ text: "Invalid email or password.", kind: "err" });
        setLoading(false);
        return;
      }
      window.location.href = "/admin";
    } catch {
      setMsg({ text: "Could not sign in. Check your connection and try again.", kind: "err" });
      setLoading(false);
    }
  };

  return (
    <main className="zl page">
      {/* ===== LEFT: HERO ===== */}
      <section className="hero" aria-label="Zuri Tours and Car Hire">
        <div className="hero-media" role="img" aria-label="Zuri Tours vehicles at sunset by the ocean in Dar es Salaam" />
        <div className="hero-inner">
          <div className="brand">
            <div className="brand-logo" role="img" aria-label="Zuri Tours logo" />
            <div>
              <div className="brand-name">Zuri Tours</div>
              <div className="brand-sub">&amp; Car Hire</div>
            </div>
          </div>

          <div className="headline">
            <h1><span>Zuri</span> Business OS</h1>
            <p className="tagline">Manage. Operate. Grow.</p>
            <div className="rule" />
            <p className="quote">Your trusted transport partner<br />in Tanzania.</p>
          </div>

          <div className="features">
            <div className="feature">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M24 4 7 10v12c0 11 7.3 18.8 17 22 9.7-3.2 17-11 17-22V10L24 4Z" /><path d="m16.5 24 5.3 5.3L32 19" />
              </svg>
              <div><b>Secure Access</b><small>Your data, our priority</small></div>
            </div>
            <div className="feature">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 33a18 18 0 1 1 36 0" /><path d="m24 33 9-10" /><circle cx="24" cy="33" r="2.6" fill="currentColor" /><path d="M11 33h3M34 33h3M24 15v3M13.5 21.5l2 2M34.5 21.5l-2 2" />
              </svg>
              <div><b>Better Operations</b><small>Drive efficiency</small></div>
            </div>
            <div className="feature">
              <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
                <path d="M3 18.5 10.5 11l6.2 6.2-7.5 7.5L3 18.5Zm42 0L37.5 11l-6.2 6.2 7.5 7.5 6.2-6.2Z" />
                <path d="M18.4 16.3c2.6-1.9 5.6-2.3 8.2-1.3l3.2 1.2 7.3 7.3-2.5 2.5L25 16.4c-1.4-.6-2.8-.6-4.4.4l-4.5 3.2c-1 .7-1 2.1-.1 2.9.8.7 1.9.7 2.7.1l3.4-2.4 13.6 13.6c1 1 1 2.6 0 3.6s-2.6 1-3.6 0l-5-5 -1.4 1.4 4.7 4.7c1 1 1 2.6 0 3.6s-2.6 1-3.6 0l-4.7-4.7-1.4 1.4 3.8 3.8c1 1 1 2.6 0 3.6s-2.6 1-3.6 0l-3.8-3.8-1.4 1.4 2.4 2.4c.9.9.9 2.4 0 3.3-.9.9-2.4.9-3.3 0L11.7 31.9l-2.4-2.4 4.8-4.8 0 0c-1.4-2.2-1-5.1 1.1-6.6l3.2-1.8Z" />
              </svg>
              <div><b>Stronger Service</b><small>For our clients</small></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RIGHT: LOGIN ===== */}
      <section className="side">
        <div className="palms" aria-hidden="true">
          <svg viewBox="0 0 200 420" style={{ right: -40, top: -20, width: 260, transform: "scaleX(-1)" }}>{PALM}</svg>
          <svg viewBox="0 0 200 420" style={{ right: 30, bottom: -60, width: 300, opacity: 0.6 }}>{PALM}</svg>
          <svg viewBox="0 0 200 420" style={{ right: 150, bottom: -90, width: 200, opacity: 0.45, transform: "scaleX(-1)" }}>{PALM}</svg>
        </div>

        <div className="card">
          <div className="card-logo" role="img" aria-label="Zuri Tours logo" />
          <h2 className="card-title">Zuri Tours &amp; Car Hire</h2>
          <div className="card-title-rule" />
          <p className="card-sub">Management System</p>

          <h3 className="welcome">Welcome Back!</h3>
          <p className="welcome-sub">Sign in to continue to your dashboard</p>

          <form onSubmit={submit} noValidate>
            <div className={`field${errors.email ? " invalid" : ""}`}>
              <div className="input-wrap">
                <svg className="lead" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7.5" r="4.5" /><path d="M3 21c.6-4.6 4.2-7.5 9-7.5s8.4 2.9 9 7.5H3Z" /></svg>
                <input id="email" type="email" placeholder="Email Address" autoComplete="username" aria-label="Email Address"
                  aria-invalid={!!errors.email} aria-describedby="emailError"
                  value={email} onChange={e => { setEmail(e.target.value); setErrors(x => ({ ...x, email: undefined })); setMsg(null); }} />
              </div>
              <p className="error" id="emailError" role="alert">{errors.email}</p>
            </div>

            <div className={`field${errors.password ? " invalid" : ""}`}>
              <div className="input-wrap">
                <svg className="lead" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 10V7.5a5 5 0 0 0-10 0V10H5.5A1.5 1.5 0 0 0 4 11.5v9A1.5 1.5 0 0 0 5.5 22h13a1.5 1.5 0 0 0 1.5-1.5v-9a1.5 1.5 0 0 0-1.5-1.5H17Zm-7.5-2.5a2.5 2.5 0 0 1 5 0V10h-5V7.5Z" /></svg>
                <input id="password" type={show ? "text" : "password"} placeholder="Password" autoComplete="current-password" aria-label="Password"
                  aria-invalid={!!errors.password} aria-describedby="passwordError"
                  value={password} onChange={e => { setPassword(e.target.value); setErrors(x => ({ ...x, password: undefined })); setMsg(null); }} />
                <button type="button" className="eye" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{!show && <path d="M3 3l18 18" />}
                  </svg>
                </button>
              </div>
              <p className="error" id="passwordError" role="alert">{errors.password}</p>
            </div>

            <div className="row">
              <label className="remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember Me</label>
              <a href="#" className="forgot" onClick={e => { e.preventDefault(); setMsg({ text: "Ask the owner to reset your password from the Users page.", kind: "info" }); }}>Forgot Password?</a>
            </div>

            <button type="submit" className="submit" disabled={loading}>
              {loading ? (
                <><span className="spinner" aria-hidden="true" /><span>Signing in…</span></>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M3 12h12" /><path d="m11 8 4 4-4 4" />
                  </svg>
                  <span>Sign In</span>
                </>
              )}
            </button>
            {msg && <p className={`form-msg show ${msg.kind}`} role="status">{msg.text}</p>}
          </form>

          <div className="card-foot">
            <div className="line">Zuri Tours &amp; Car Hire</div>
            <div className="motto">— Travel Further. Together. —</div>
          </div>
        </div>
      </section>
    </main>
  );
}
