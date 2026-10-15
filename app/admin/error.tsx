"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";

export default function Error({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Until proper error tracking is wired up this is the only record we get.
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>

      <h1 className="font-display text-2xl font-medium text-ink mb-2">Something went wrong</h1>
      <p className="text-muted text-sm max-w-sm mb-6">
        The page didn&apos;t load. Nothing you entered has been lost — try again, and if it keeps
        happening tell Mo what you were doing.
      </p>

      {error.digest && (
        <p className="text-xs text-muted font-mono mb-6">Reference: {error.digest}</p>
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={reset}
          className="flex items-center gap-2 bg-gold text-ink px-5 py-2.5 text-sm font-medium rounded-xl hover:bg-gold/90">
          <RotateCw className="w-4 h-4" /> Try again
        </button>
        <Link href="/admin"
          className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl hover:border-ink/30">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
