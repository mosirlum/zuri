"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Highlight from "@/components/Highlight";

interface SectionHeaderProps {
  label: string;
  heading: string;
  intro?: string;
  center?: boolean;
}

export default function SectionHeader({
  label,
  heading,
  intro,
  center = false,
}: SectionHeaderProps) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
      className={center ? "text-center max-w-3xl mx-auto mb-16" : "mb-12"}
    >
      <div
        className={`flex items-center gap-4 text-[0.7rem] tracking-[0.3em] uppercase text-muted mb-6 font-medium ${
          center ? "justify-center" : ""
        }`}
      >
        <span className="w-8 h-px bg-gold" />
        {label}
        {center && <span className="w-8 h-px bg-gold" />}
      </div>
      <h2 className="font-display text-ink text-[2.3rem] sm:text-[3rem] lg:text-[4.5rem] leading-[1] tracking-tight mb-5">
        <Highlight text={heading} />
      </h2>
      {intro && (
        <p
          className={`text-ink-soft text-lg leading-relaxed font-light ${
            center ? "max-w-2xl mx-auto" : "max-w-2xl"
          }`}
        >
          {intro}
        </p>
      )}
    </motion.div>
  );
}
