"use client";

/**
 * FLEET — Interactive fleet cards with hover expansion.
 *
 * Each card stays collapsed by default. Hover one card to expand it,
 * reveal the full image in color, and display the title, button, and tagline.
 * The inactive cards stay desaturated and show only the category label.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { fleet, fleetFilters } from "@/lib/data";
import Highlight from "@/components/Highlight";
import SectionHeader from "@/components/SectionHeader";

export default function Fleet() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const filteredItems =
    activeFilter === "All"
      ? fleet.items
      : fleet.items.filter((item) => item.category === activeFilter);

  return (
    <section id="fleet" className="py-24 px-6 lg:px-10 bg-paper-soft">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-end mb-12">
          <SectionHeader
            label={fleet.label}
            heading={fleet.heading}
            intro={fleet.intro}
          />

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-0 border-t border-ink/10 pt-5">
            {fleetFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setActiveFilter(filter);
                  setActiveIndex(null);
                }}
                className={`pr-5 py-1 font-display italic text-lg cursor-pointer transition-colors ${
                  activeFilter === filter
                    ? "text-gold"
                    : "text-muted hover:text-ink"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div
          className="overflow-x-auto lg:overflow-visible pb-5 hide-scrollbar"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <div className="grid grid-cols-1 gap-5 lg:flex lg:gap-5 lg:min-h-[520px] lg:pr-6">
            {filteredItems.map((item, idx) => (
              <FleetCard
                key={item.name}
                item={item}
                idx={idx}
                active={activeIndex === idx}
                anyActive={activeIndex !== null}
                onActivate={() => setActiveIndex(idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FleetCard({
  item,
  idx,
  active,
  anyActive,
  onActivate,
}: {
  item: (typeof fleet.items)[number];
  idx: number;
  active: boolean;
  anyActive: boolean;
  onActivate: () => void;
}) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  const widthClass = anyActive
    ? active
      ? "lg:flex-[3.5] lg:min-w-0 w-full"
      : "lg:flex-[0.85] lg:min-w-0 w-full"
    : "lg:flex-1 lg:min-w-0 w-full";

  return (
    <motion.div
      ref={ref}
      layout
      onMouseEnter={onActivate}
      onClick={onActivate}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay: idx * 0.05 }}
      className={`group ${widthClass} min-w-0 transition-all duration-500`}
    >
      <div
        className={`relative overflow-hidden rounded-[2rem] bg-cream shadow-xl h-[420px] sm:h-[520px] transition-all duration-500 ${
          active ? "shadow-2xl" : "shadow-lg"
        }`}
      >
        <FleetImage
          src={item.image}
          alt={item.name.replace(/\*/g, "")}
          inactive={anyActive && !active}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-6 transition-all duration-[1000ms] ease-out transform translate-y-10 group-hover:translate-y-0">
          <span className="block mb-2 text-[0.7rem] tracking-[0.32em] uppercase text-gold font-semibold">
            {item.tag}
          </span>
          <h3 className="font-display text-3xl font-semibold leading-tight tracking-tight text-paper drop-shadow-[0_2px_16px_rgba(0,0,0,0.65)]">
            <Highlight text={item.name} />
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-paper/80 max-w-md">
            {item.specs}
          </p>
          <p className="mt-4 text-[0.77rem] uppercase tracking-[0.3em] text-paper/70">
            Full air conditioning · comfortable seating · ready for the road
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function FleetImage({
  src,
  alt,
  inactive,
}: {
  src: string;
  alt: string;
  inactive: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover transition-all duration-[1000ms] ${
        inactive ? "filter grayscale contrast-110 opacity-60" : "filter-none"
      }`}
      onError={(e) => {
        const target = e.currentTarget;
        target.style.display = "none";
        const parent = target.parentElement;
        if (parent && !parent.querySelector(".placeholder-fallback")) {
          const fallback = document.createElement("div");
          fallback.className =
            "placeholder-fallback img-placeholder absolute inset-0";
          fallback.innerHTML = `<div class="img-placeholder-label">${alt}<small>${src}</small></div>`;
          parent.appendChild(fallback);
        }
      }}
    />
  );
}
