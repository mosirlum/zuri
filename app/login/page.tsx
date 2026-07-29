"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    // Get user role then redirect
    const res = await fetch("/api/me");
    const data = await res.json();

    if (data.role === "driver") {
      window.location.href = "/driver";
    } else {
      window.location.href = "/admin";
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(250,247,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(250,247,241,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/zuri-emblem.png"
            alt="Zuri Tours"
            className="h-20 w-auto mx-auto mb-6"
          />
          <h1 className="font-display text-3xl text-paper font-medium">
            Zuri<em className="italic text-gold">.</em> Business OS
          </h1>
          <p className="text-paper/60 text-sm mt-2 tracking-widest uppercase">
            Staff & Driver Portal
          </p>
        </div>

        <div className="bg-paper/5 border border-paper/10 p-8 rounded-2xl backdrop-blur">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[0.7rem] tracking-[0.25em] uppercase text-paper/60 mb-2 font-medium">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@zuritours.co.tz"
                className="w-full bg-paper/5 border border-paper/15 text-paper placeholder-paper/30 px-4 py-3 rounded-lg outline-none focus:border-gold transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-[0.7rem] tracking-[0.25em] uppercase text-paper/60 mb-2 font-medium">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-paper/5 border border-paper/15 text-paper placeholder-paper/30 px-4 py-3 rounded-lg outline-none focus:border-gold transition-colors text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-ink py-3.5 text-[0.75rem] tracking-[0.2em] uppercase font-semibold hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-paper/30 text-xs mt-6">
          Zuri Tours & Car Hire · Internal System
        </p>
      </div>
    </div>
  );
}
