"use client";

/**
 * MISSION & VISION
 *
 * Advanced layout: dark split-screen panel with giant italic
 * background letters (M and V). On hover, letter brightens and lifts.
 * Side-by-side, NOT stacked cards.
 */

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { mvision } from "@/lib/data";
import Highlight from "@/components/Highlight";

export default function MissionVision() {
  return (
    <section className="bg-ink text-paper relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
        <Panel data={mvision.mission} index={0} />
        <Panel data={mvision.vision} index={1} />
      </div>
    </section>
  );
}

function Panel({
  data,
  index,
}: {
  data: typeof mvision.mission | typeof mvision.vision;
  index: number;
}) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.8, delay: index * 0.15 }}
      className={`group relative px-8 lg:px-12 py-20 lg:py-24 flex flex-col justify-between overflow-hidden transition-colors duration-500 hover:bg-gold/[0.06] ${
        index === 0 ? "lg:border-r border-paper/10" : ""
      } ${index === 1 ? "max-lg:border-t max-lg:border-paper/10" : ""}`}
    >
      {/* Giant background letter */}
      <div className="absolute -top-4 right-4 font-display italic text-[16rem] lg:text-[22rem] leading-[0.85] text-gold opacity-[0.08] font-medium pointer-events-none transition-all duration-500 group-hover:opacity-[0.15] group-hover:-translate-y-2">
        {data.letter}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-gold mb-6 font-medium">
          {data.label}
        </div>
        <h3 className="font-display text-3xl lg:text-[2.6rem] font-medium leading-tight tracking-tight mb-6">
          <Highlight text={data.heading} />
        </h3>
        <p className="text-base leading-relaxed opacity-85 font-light">
          {data.text}
        </p>
      </div>

      <div className="relative z-10 mt-10 pt-6 border-t border-paper/15 font-display italic text-base text-gold">
        {data.footer}
      </div>
    </motion.div>
  );
}
