import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-5">
        <Compass className="w-7 h-7 text-gold" />
      </div>

      <h1 className="font-display text-3xl font-medium text-ink mb-2">
        Page <em className="italic text-gold">not found</em>
      </h1>
      <p className="text-muted text-sm max-w-sm mb-6">
        That address doesn&apos;t lead anywhere.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link href="/"
          className="bg-ink text-paper px-5 py-2.5 text-sm font-medium rounded-xl hover:bg-gold hover:text-ink transition-colors">
          Go to zuritours.co.tz
        </Link>
        <Link href="/admin"
          className="px-5 py-2.5 text-sm text-muted border border-ink/15 rounded-xl hover:border-ink/30">
          Business OS
        </Link>
      </div>
    </div>
  );
}
