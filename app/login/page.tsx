"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const AMBER = "#E08E0B";

function Icon({ d, className = "w-5 h-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  mail: "M3 7l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z",
  lock: "M7 11V8a5 5 0 0110 0v3M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff: "M3 3l18 18M10.6 6.1A9.7 9.7 0 0112 6c6.4 0 10 6 10 6a17 17 0 01-3.2 3.9M6.6 6.6A17 17 0 002 12s3.6 6 10 6c1.5 0 2.8-.3 4-.8M9.9 9.9a3 3 0 004.2 4.2",
  shield: "M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6l8-3zM9 12l2 2 4-4",
  gauge: "M4 17a8 8 0 1116 0M12 17l4-5M7 17h.01M17 17h.01M12 9v.01",
  handshake: "M3 12l4-4 4 1 3-2 5 4-5 6-3-1-2 2-6-6zM3 12l3 3",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

const FEATURES = [
  { icon: ICONS.shield, title: "Secure access", sub: "Your data, our priority" },
  { icon: ICONS.gauge, title: "Better operations", sub: "Drive efficiency" },
  { icon: ICONS.handshake, title: "Stronger service", sub: "For our clients" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    window.location.href = "/admin";
  };

  const field =
    "w-full h-14 rounded-2xl border border-black/10 bg-white/80 pl-12 pr-12 text-[15px] text-ink placeholder-black/35 outline-none transition focus:border-[#E08E0B] focus:ring-4 focus:ring-[#E08E0B]/15";

  return (
    <div className="zl min-h-screen grid lg:grid-cols-[1.12fr_1fr] bg-[#f7f2ea]">
      <style>{`
        @keyframes zl-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes zl-drift { from { transform: scale(1.04); } to { transform: scale(1.12) translateX(-1.5%); } }
        .zl-rise { animation: zl-rise .7s cubic-bezier(.2,.7,.2,1) both; }
        .zl-drift { animation: zl-drift 24s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .zl-rise, .zl-drift { animation: none; } }
      `}</style>

      {/* Brand panel */}
      <div className="relative h-60 sm:h-72 lg:h-auto lg:min-h-screen">
        <div
          className="hidden lg:block absolute inset-y-0 left-0 -right-3"
          style={{ background: `linear-gradient(180deg, #F6B53A, ${AMBER} 55%, #B96A00)`, borderRadius: "0 38% 38% 0 / 0 50% 50% 0" }}
        />
        <div className="relative h-full overflow-hidden lg:[border-radius:0_38%_38%_0/0_50%_50%_0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-bg.jpg" alt="" className="zl-drift absolute inset-0 h-full w-full object-cover object-[60%_65%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120d08] via-[#120d08]/45 to-[#120d08]/20" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#E08E0B]/30 via-transparent to-transparent mix-blend-soft-light" />

          <div className="relative h-full flex flex-col justify-between p-6 sm:p-10 lg:p-14">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/zuri-emblem.png" alt="Zuri Tours" className="h-11 w-11 sm:h-14 sm:w-14 rounded-full object-cover ring-2 ring-white/25" />
              <div className="leading-tight">
                <div className="font-display text-xl sm:text-2xl text-white">Zuri Tours</div>
                <div className="text-[0.68rem] tracking-[0.28em] uppercase text-white/70">& Car Hire</div>
              </div>
            </div>

            <div className="hidden lg:block max-w-lg">
              <h1 className="font-display text-5xl xl:text-6xl text-white leading-[1.05]">
                <span style={{ color: AMBER }}>Zuri</span> Business OS
              </h1>
              <div className="mt-5 h-px w-24" style={{ background: AMBER }} />
              <p className="mt-5 text-lg text-white/80 tracking-wide">Manage. Operate. Grow.</p>
            </div>

            <div className="hidden lg:grid grid-cols-3 gap-6 border-t border-white/15 pt-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <Icon d={f.icon} className="w-7 h-7 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-white">{f.title}</div>
                    <div className="text-xs text-white/60 mt-0.5">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <style>{`.zl .grid svg { color: ${AMBER}; }`}</style>
          </div>
        </div>
      </div>

      {/* Sign-in */}
      <div className="relative flex items-center justify-center px-5 py-10 lg:py-0 -mt-10 lg:mt-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_10%,rgba(224,142,11,0.12),transparent),radial-gradient(50%_40%_at_10%_100%,rgba(224,142,11,0.08),transparent)]" />

        <div className="zl-rise relative w-full max-w-[26rem] rounded-[1.75rem] bg-white/90 backdrop-blur-xl border border-white shadow-[0_30px_80px_-20px_rgba(60,35,5,0.28)] px-7 sm:px-9 py-9">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/zuri-emblem.png" alt="Zuri Tours" className="mx-auto h-20 w-20 rounded-full object-cover shadow-lg shadow-black/10" />
            <h2 className="font-display text-3xl text-ink mt-5">Welcome back</h2>
            <p className="text-sm text-black/50 mt-1.5">Sign in to continue</p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div className="relative">
              <Icon d={ICONS.mail} className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-black/35" />
              <input
                type="email"
                required
                autoComplete="username"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className={field}
              />
            </div>

            <div className="relative">
              <Icon d={ICONS.lock} className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-black/35" />
              <input
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={field}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-black/40 hover:text-black/70 transition"
              >
                <Icon d={show ? ICONS.eyeOff : ICONS.eye} />
              </button>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full h-14 rounded-2xl text-white font-medium tracking-wide flex items-center justify-center gap-2.5 shadow-[0_12px_30px_-10px_rgba(224,142,11,0.7)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(180deg, #F0A21C, ${AMBER})` }}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Signing in
                </>
              ) : (
                <>
                  Sign in
                  <Icon d={ICONS.arrow} className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3 text-[0.7rem] tracking-[0.22em] uppercase text-black/35">
            <span className="h-px flex-1 bg-black/10" />
            Zuri Tours &amp; Car Hire
            <span className="h-px flex-1 bg-black/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
