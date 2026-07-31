"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, KeyRound } from "lucide-react";

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
      setSaving(false);
    } catch {
      setError("Network error — try again");
      setSaving(false);
    }
  };

  const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
  const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">Change Password</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              Password updated successfully.
            </p>
            <button onClick={onClose} className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium">Done</button>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              <div>
                <label className={lbl}>Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="off" className={inp} />
              </div>
              <div>
                <label className={lbl}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="off" className={inp} />
              </div>
              <div>
                <label className={lbl}>Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="off" className={inp} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
              <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
              <button onClick={handleSave} disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50">
                {saving ? "Saving..." : "Update Password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    const role = (session.user as any)?.role;
    if (role !== "driver") {
      router.push("/admin");
      return;
    }
  }, [session, status, router]);

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  if (status === "loading" || !session || (session.user as any)?.role !== "driver") {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/zuri-emblem.png" alt="Zuri" className="h-16 w-auto animate-pulse" />
      </div>
    );
  }

  const driverName = session.user?.name || "Driver";

  return (
    <div className="min-h-screen bg-paper-soft">
      <header className="bg-ink text-paper px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/zuri-emblem.png" alt="Zuri" className="h-9 w-auto" />
          <div>
            <div className="font-display text-lg font-medium leading-none">
              {driverName}
            </div>
            <div className="text-[0.55rem] tracking-widest uppercase text-paper/50 mt-0.5">
              Driver Portal
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPasswordModal(true)} className="text-paper/60 hover:text-gold transition-colors" title="Change Password">
            <KeyRound className="w-4 h-4" />
          </button>
          <button onClick={logout} className="flex items-center gap-2 text-paper/60 hover:text-red-400 text-sm transition-colors">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>
      <main className="p-5 max-w-2xl mx-auto">{children}</main>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
