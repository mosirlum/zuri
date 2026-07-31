"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";

interface AppUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

const roleColors: Record<string, string> = {
  super_admin: "bg-gold/20 text-gold border border-gold/30",
  staff: "bg-blue-100 text-blue-700",
  driver: "bg-gray-100 text-gray-600",
};

const roleLabels: Record<string, string> = {
  super_admin: "Boss / Super Admin",
  staff: "Staff",
  driver: "Driver",
};

function DeleteUserModal({ user, onClose, onDeleted }: {
  user: AppUser;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [blocked, setBlocked] = useState<{ count: number; message: string } | null>(null);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "has_history") {
          setBlocked({ count: data.count, message: data.message });
        } else {
          setError(data.error || "Something went wrong");
        }
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Network error");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">{blocked ? "Can't Delete" : "Delete User"}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="bg-paper-soft border border-ink/10 rounded-xl px-4 py-3">
            <div className="text-sm font-semibold text-ink">{user.full_name}</div>
            <div className="text-xs text-muted mt-0.5">{user.email} · {roleLabels[user.role] || user.role}</div>
          </div>

          {blocked ? (
            <>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
                {blocked.message}
              </div>
              <p className="text-xs text-muted">Uncheck <strong className="text-ink">Account is active</strong> instead — they lose access, the records stay.</p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">This cannot be undone.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">
            {blocked ? "Close" : "Cancel"}
          </button>
          {!blocked && (
            <button onClick={handleDelete} disabled={deleting}
              className="px-5 py-2.5 text-sm bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UserForm({ user, onClose, onSave }: {
  user: AppUser | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState(user?.role || "staff");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: user ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          user
            ? {
                id: user.id,
                full_name: fullName,
                phone: phone || null,
                role,
                is_active: isActive,
                new_password: newPassword || undefined,
              }
            : {
                full_name: fullName,
                email,
                phone: phone || null,
                role,
                password,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSaving(false);
        return;
      }
      onSave();
    } catch (err) {
      setError("Network error — try again");
      setSaving(false);
    }
  };

  const inp = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors";
  const sel = "w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold";
  const lbl = "block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium";

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between sticky top-0 bg-paper z-10">
          <h2 className="font-display text-xl font-medium">{user ? "Edit User" : "Add User"}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <div>
            <label className={lbl}>Full Name *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="off" className={inp} />
          </div>

          <div>
            <label className={lbl}>Email {user ? "(cannot be changed)" : "*"}</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="off"
              disabled={!!user}
              className={`${inp} ${user ? "opacity-60 cursor-not-allowed" : ""}`}
            />
          </div>

          <div>
            <label className={lbl}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} autoComplete="off" className={inp} />
          </div>

          <div>
            <label className={lbl}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className={sel}>
              <option value="staff">Staff (no Finance / Reports / Users)</option>
              <option value="super_admin">Boss / Super Admin (full access)</option>
              <option value="driver">Driver (driver portal only)</option>
            </select>
          </div>

          {!user && (
            <div>
              <label className={lbl}>Initial Password *</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" className={inp} />
            </div>
          )}

          {user && (
            <div>
              <label className={lbl}>Reset Password (optional)</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="off"
                placeholder="Leave blank to keep current password" className={inp} />
            </div>
          )}

          {user && (
            <div className="flex items-center gap-3 bg-paper-soft border border-ink/10 rounded-xl px-4 py-3">
              <input type="checkbox" id="active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-gold" />
              <label htmlFor="active" className="text-sm font-medium text-ink cursor-pointer">Account is active (can log in)</label>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !fullName || (!user && (!email || !password))}
            className="px-5 py-2.5 text-sm bg-gold text-ink rounded-xl font-medium hover:bg-gold/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : user ? "Update User" : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink">
            User <em className="italic text-gold">Management</em>
          </h1>
          <p className="text-muted text-sm mt-1">Add staff and drivers, control what they can see.</p>
        </div>
        <button onClick={() => { setEditUser(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors rounded-xl">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm animate-pulse">Loading users...</div>
      ) : (
        <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
          <div className="divide-y divide-ink/5">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center text-ink font-bold text-sm flex-shrink-0">
                    {u.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{u.full_name}</span>
                      {!u.is_active && (
                        <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Inactive</span>
                      )}
                    </div>
                    <div className="text-xs text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${roleColors[u.role]}`}>
                    {roleLabels[u.role] || u.role}
                  </span>
                  <button onClick={() => { setEditUser(u); setShowForm(true); }} title="Edit"
                    className="p-2 text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteUser(u)} title="Delete"
                    className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <UserForm
          user={editUser}
          onClose={() => setShowForm(false)}
          onSave={() => { fetchUsers(); setShowForm(false); }}
        />
      )}

      {deleteUser && (
        <DeleteUserModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onDeleted={() => { fetchUsers(); setDeleteUser(null); }}
        />
      )}
    </div>
  );
}
