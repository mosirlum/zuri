"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { KeyRound, User, Check, Target } from "lucide-react";

const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";

const roleLabels: Record<string, string> = {
  super_admin: "Boss / Super Admin",
  staff: "Staff",
  driver: "Driver",
};

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSaving(false);
        return;
      }
      setDone(true);
      setSaving(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Network error");
      setSaving(false);
    }
  };

  return (
    <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-gold" />
        <h2 className="font-display text-xl font-medium">Password</h2>
      </div>

      <div className="p-6 space-y-4 max-w-md">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
        {done && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4" /> Password updated
          </div>
        )}

        <div>
          <label className={lbl}>Current Password</label>
          <input type="password" value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setDone(false); }} autoComplete="off" className={inp} />
        </div>
        <div>
          <label className={lbl}>New Password</label>
          <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setDone(false); }} autoComplete="off" className={inp} />
        </div>
        <div>
          <label className={lbl}>Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setDone(false); }} autoComplete="off" className={inp} />
        </div>

        <button onClick={handleSave} disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
          {saving ? "Saving..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}

function BusinessSettings() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/business-settings").then(r => (r.ok ? r.json() : null)).then(d => { if (d) setValue(String(d.target_margin)); }).catch(() => {});
  }, []);

  const save = async () => {
    setState("saving"); setMsg("");
    try {
      const res = await fetch("/api/admin/business-settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_margin: value }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || "Something went wrong"); setState("error"); return; }
      setState("saved"); setTimeout(() => setState("idle"), 2000);
    } catch { setMsg("Could not save. Nothing was changed."); setState("error"); }
  };

  return (
    <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
        <Target className="w-4 h-4 text-gold" />
        <h2 className="font-display text-xl font-medium">Business</h2>
      </div>
      <div className="p-6 max-w-sm">
        <label className={lbl}>Target profit margin (%)</label>
        <input className={inp} inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} />
        <p className="text-xs text-muted mt-2">The written analysis and Growth page warn you when a vehicle or the month falls below this, and suggest a price to get back to it.</p>
        {msg && <p className="text-sm text-red-600 mt-2">{msg}</p>}
        <button onClick={save} disabled={state === "saving"} className="mt-4 bg-ink text-paper px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gold transition-colors disabled:opacity-60">
          {state === "saving" ? "Saving..." : state === "saved" ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">
          <em className="italic text-gold">Settings</em>
        </h1>
      </div>

      <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
          <User className="w-4 h-4 text-gold" />
          <h2 className="font-display text-xl font-medium">Account</h2>
        </div>
        <div className="divide-y divide-ink/5">
          <div className="px-6 py-3 flex justify-between text-sm">
            <span className="text-muted">Name</span>
            <span className="text-ink font-medium">{session?.user?.name || "—"}</span>
          </div>
          <div className="px-6 py-3 flex justify-between text-sm">
            <span className="text-muted">Email</span>
            <span className="text-ink">{session?.user?.email || "—"}</span>
          </div>
          <div className="px-6 py-3 flex justify-between text-sm">
            <span className="text-muted">Role</span>
            <span className="text-ink">{roleLabels[role] || role || "—"}</span>
          </div>
        </div>
      </div>

      {role === "super_admin" && <BusinessSettings />}

      <ChangePassword />
    </div>
  );
}
