"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";

const ago = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-TZ", { day: "numeric", month: "short" });
};

// Who changed what, newest first. Boss only: the API refuses everyone else.
export default function ActivityFeed() {
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/activity").then(r => (r.ok ? r.json() : [])).then(d => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([]));
  }, []);

  return (
    <div className="bg-paper rounded-2xl border border-ink/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
        <History className="w-4 h-4 text-gold" />
        <h2 className="font-display text-xl font-medium">Recent activity</h2>
      </div>
      {rows === null ? <div className="p-6"><div className="h-20 rounded-lg bg-ink/5 animate-pulse" /></div>
        : rows.length === 0 ? <p className="px-6 py-8 text-sm text-muted text-center">Nothing recorded yet. Changes made from now on will appear here.</p>
        : (
          <ul className="divide-y divide-ink/5 max-h-96 overflow-auto">
            {rows.map(r => (
              <li key={r.id} className="px-6 py-3 flex justify-between gap-4 text-sm">
                <span className="min-w-0"><b className="text-ink">{r.user_name}</b> <span className="text-muted">· {r.action}</span><br /><span className="text-ink-soft break-words">{r.detail}</span></span>
                <span className="flex-none text-xs text-muted">{ago(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
