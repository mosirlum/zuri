export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-64 rounded-lg bg-ink/5 animate-pulse" />
      <div className="h-4 w-40 rounded bg-ink/5 animate-pulse" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-paper rounded-2xl border border-ink/10 p-5">
            <div className="w-10 h-10 rounded-xl bg-ink/5 animate-pulse mb-3" />
            <div className="h-7 w-24 rounded bg-ink/5 animate-pulse mb-2" />
            <div className="h-3 w-20 rounded bg-ink/5 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="bg-paper rounded-2xl border border-ink/10 p-6 space-y-3">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 rounded-lg bg-ink/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
