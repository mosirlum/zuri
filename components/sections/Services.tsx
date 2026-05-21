"use client";

/**
 * SERVICES — Advanced card with image reveal
 *
 * Default state: dark cover with title/description
 * Hover: dark cover slides UP, revealing real photo behind
 *
 * TO REPLACE SERVICE PHOTOS:
 *   Drop matching images in /public/images/:
 *     service-car-hire.jpg, service-airport.jpg,
 *     service-executive.jpg, service-staff.jpg,
 *     service-wedding.jpg, service-safari.jpg
 *   Each ~600x750 portrait, showing a CAR matching that service.
 *
 *   The image src is set in lib/data.ts → services.items[].image
 *   If image is missing, a styled placeholder is shown instead.
 */

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { services } from "@/lib/data";
import Highlight from "@/components/Highlight";
import SectionHeader from "@/components/SectionHeader";

export default function Services() {
  return (
    <section id="services" className="py-24 px-6 lg:px-10 bg-paper">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          label={services.label}
          heading={services.heading}
          intro={services.intro}
          center
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.items.map((item, idx) => (
            <ServiceCard key={item.num} item={item} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  item,
  idx,
}: {
  item: (typeof services.items)[number];
  idx: number;
}) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: idx * 0.08 }}
      className="group relative aspect-[4/5] overflow-hidden cursor-pointer bg-cream"
    >
      {/* Background image (revealed on hover) */}
      <div className="absolute inset-0 z-0 transition-transform duration-[800ms] ease-out group-hover:scale-[1.05]">
        <ServiceImage src={item.image} label={item.label} />
      </div>

      {/* Dark cover that slides up on hover */}
      <div className="absolute inset-0 z-[1] bg-ink transition-transform duration-[800ms] ease-out group-hover:-translate-y-full origin-bottom" />

      {/* Default content (visible until hover) */}
      <div className="relative z-[2] h-full p-7 flex flex-col justify-between text-paper transition-opacity duration-300 group-hover:opacity-0">
        <div>
          <h3 className="font-display text-3xl font-medium leading-tight tracking-tight">
            <Highlight text={item.title} />
          </h3>
          <p className="text-sm leading-relaxed opacity-85 mt-3">{item.desc}</p>
        </div>
      </div>

      {/* Bottom info that appears on image when hovered */}
      <div className="absolute bottom-0 left-0 right-0 z-[3] p-7 bg-gradient-to-t from-ink/85 to-transparent text-paper translate-y-5 opacity-0 transition-all duration-500 delay-300 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="font-display italic text-2xl leading-tight">
          <Highlight text={item.label} />
        </div>
      </div>
    </motion.div>
  );
}

// Service image with fallback placeholder
function ServiceImage({ src, label }: { src: string; label: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      className="w-full h-full object-cover"
      onError={(e) => {
        // Hide broken image and show placeholder text overlay
        const target = e.currentTarget;
        target.style.display = "none";
        const parent = target.parentElement;
        if (parent && !parent.querySelector(".placeholder-fallback")) {
          const fallback = document.createElement("div");
          fallback.className = "placeholder-fallback img-placeholder absolute inset-0";
          fallback.innerHTML = `<div class="img-placeholder-label">${label} photo<small>${src}</small></div>`;
          parent.appendChild(fallback);
        }
      }}
    />
  );
}
