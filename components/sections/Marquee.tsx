import { marqueeItems } from "@/lib/data";

export default function Marquee() {
  const items = [...marqueeItems, ...marqueeItems];

  return (
    <div
      className="bg-cream py-5 overflow-hidden border-y border-ink/10"
      aria-hidden="true"
    >
      <div className="flex gap-14 animate-marquee whitespace-nowrap font-display italic text-2xl text-ink">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-6">
            {item}
            <span className="text-gold text-sm not-italic">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
