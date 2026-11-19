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

// A small scene for the brand panel: a safari vehicle driving into a sunset.
// Pure SVG and CSS, no image to load, and it stops moving for anyone who has
// asked their device to reduce motion.
function LoginScene() {
  return (
    <div className="absolute inset-0" aria-hidden="true" style={{ background: "linear-gradient(180deg,#2b1a3a 0%,#7a3b4a 38%,#e98a2e 70%,#f6c26b 100%)" }}>
      <style>{`
        @keyframes zs-sun { from { transform: translateY(6px); } to { transform: translateY(-6px); } }
        @keyframes zs-dash { to { transform: translateX(-120px); } }
        @keyframes zs-bob { 50% { transform: translateY(-2.5px); } }
        @keyframes zs-spin { to { transform: rotate(360deg); } }
        @keyframes zs-far { to { transform: translateX(-800px); } }
        @keyframes zs-dust { 0% { opacity: .5; transform: translate(0,0) scale(.6); } 100% { opacity: 0; transform: translate(-60px,-12px) scale(1.6); } }
        .zs-sun { animation: zs-sun 9s ease-in-out infinite alternate; }
        .zs-dash { animation: zs-dash 1.1s linear infinite; }
        .zs-car { animation: zs-bob 1.4s ease-in-out infinite; }
        .zs-wheel { animation: zs-spin .55s linear infinite; transform-box: fill-box; transform-origin: center; }
        .zs-far { animation: zs-far 90s linear infinite; }
        .zs-dust { animation: zs-dust 1.6s ease-out infinite; opacity: 0; }
        @media (prefers-reduced-motion: reduce) { .zs-sun,.zs-dash,.zs-car,.zs-wheel,.zs-far,.zs-dust { animation: none; } .zs-dust { opacity: .25; } }
      `}</style>
      <svg viewBox="0 0 800 700" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="zs-sg" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff6d6" /><stop offset=".35" stopColor="#ffd27a" /><stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="zs-sun"><circle cx="560" cy="430" r="150" fill="url(#zs-sg)" /><circle cx="560" cy="430" r="46" fill="#fff3c9" /></g>
        <g className="zs-far" opacity=".55" fill="#3a1f2c">
          <path id="zs-sky" d="M0 520h60v-70h30v70h20v-110h34v110h26v-60h30v60h40v-90h28v90h50v-50h24v50h60v-120h30v120h40v-70h30v70h50v-100h26v100h60v-60h30v60h50v-80h30v80h60v-50h26v50H800v40H0z" />
          <path transform="translate(800 0)" d="M0 520h60v-70h30v70h20v-110h34v110h26v-60h30v60h40v-90h28v90h50v-50h24v50h60v-120h30v120h40v-70h30v70h50v-100h26v100h60v-60h30v60h50v-80h30v80h60v-50h26v50H800v40H0z" />
          <path transform="translate(-800 0)" d="M0 520h60v-70h30v70h20v-110h34v110h26v-60h30v60h40v-90h28v90h50v-50h24v50h60v-120h30v120h40v-70h30v70h50v-100h26v100h60v-60h30v60h50v-80h30v80h60v-50h26v50H800v40H0z" />
        </g>
        <path d="M-20 340c60-60 150-90 230-70 20-30 80-46 130-30 60-24 130-6 150 30 40 4 70 30 60 60H-20z" fill="#2a1522" opacity=".9" />
        <rect x="140" y="330" width="14" height="190" fill="#24121c" />
        <rect x="0" y="520" width="800" height="180" fill="#2a1620" />
        <rect x="0" y="548" width="800" height="152" fill="#1e0f17" />
        <g className="zs-dash" fill="#f6c26b" opacity=".8">
          {[0, 120, 240, 360, 480, 600, 720, 840].map(x => <rect key={x} x={x} y="612" width="70" height="6" rx="3" />)}
        </g>
        <g className="zs-car">
          <g transform="translate(250 462)">
            <path d="M0 96 L0 62 Q0 52 12 48 L50 40 L84 6 Q90 0 100 0 L214 0 Q226 0 232 8 L262 48 L300 54 Q312 56 312 68 L312 96 Z" fill="#14100c" />
            <path d="M92 12 L56 44 L150 44 L150 12 Z M160 12 L160 44 L244 44 L222 12 Z" fill="#6a4a36" opacity=".85" />
            <rect x="96" y="-8" width="116" height="5" rx="2.5" fill="#3a2e24" />
            <rect x="290" y="62" width="22" height="9" rx="4" fill="#ffe2a0" />
            <rect x="0" y="66" width="10" height="9" rx="4" fill="#d6402c" />
            <rect x="120" y="70" width="56" height="12" rx="3" fill="#E08E0B" />
            <text x="148" y="80" textAnchor="middle" style={{ fill: "#1b120a", font: "700 9px sans-serif" }}>ZURI</text>
            {[66, 246].map(x => (
              <g key={x} transform={`translate(${x} 98)`}>
                <circle r="25" fill="#0a0806" />
                <circle className="zs-wheel" r="14" fill="#6b5c4b" />
                <g className="zs-wheel" stroke="#b9a68b" strokeWidth="3"><path d="M-12 0H12M0 -12V12" /></g>
              </g>
            ))}
          </g>
          <g transform="translate(236 600)">
            <circle className="zs-dust" r="10" fill="#d9b684" />
            <circle className="zs-dust" r="8" fill="#d9b684" style={{ animationDelay: ".5s" }} />
            <circle className="zs-dust" r="12" fill="#d9b684" style={{ animationDelay: "1s" }} />
          </g>
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#120d08]/40 via-transparent to-[#120d08]/20" />
    </div>
  );
}

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
          <LoginScene />

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
