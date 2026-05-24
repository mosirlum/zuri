"use client";

/**
 * ABOUT — Side-by-side: image left, story right
 *
 * TO REPLACE ABOUT PHOTO:
 *   Drop /public/images/about-team.jpg
 *   Recommended: LANDSCAPE photo, around 1200x900 (4:3 ratio)
 *   Path set in lib/data.ts → about.image
 *
 *   Best photo: a wide shot of your fleet parked, your office,
 *   or your team. Landscape works best in this 4:3 frame.
 */

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { about } from "@/lib/data";
import Highlight from "@/components/Highlight";

export default function About() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <section id="about" className="py-24 px-6 lg:px-10 bg-paper">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Photo with gold offset border — landscape, shows whole image */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative aspect-[4/3] ml-4 lg:ml-0"
          >
            {/* Offset gold border behind — hidden on very small screens to avoid clipping */}
            <div className="hidden sm:block absolute inset-0 border border-gold translate-x-[-15px] translate-y-[15px] -z-10" />

            <div className="w-full h-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={about.image}
                alt="Zuri fleet"
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="img-placeholder"><div class="img-placeholder-label">About photo<small>${about.image} · 1200×900 landscape</small></div></div>`;
                  }
                }}
              />
            </div>
          </motion.div>

          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex items-center gap-4 text-[0.7rem] tracking-[0.3em] uppercase text-muted mb-6 font-medium">
              <span className="w-8 h-px bg-gold" />
              {about.label}
            </div>

            <h2 className="font-display text-ink text-[2.3rem] sm:text-[3rem] lg:text-[4.5rem] leading-[1] tracking-tight mb-8">
              <Highlight text={about.heading} />
            </h2>

            {about.paragraphs.map((para, i) => (
              <p
                key={i}
                className={`text-ink-soft leading-relaxed mb-5 font-light ${
                  i === 0
                    ? "text-lg [&::first-letter]:font-display [&::first-letter]:text-[4rem] [&::first-letter]:font-medium [&::first-letter]:text-gold [&::first-letter]:float-left [&::first-letter]:leading-[0.85] [&::first-letter]:mr-2 [&::first-letter]:italic"
                    : "text-base"
                }`}
              >
                {para}
              </p>
            ))}

            <p className="text-sm text-muted leading-relaxed">{about.closer}</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
