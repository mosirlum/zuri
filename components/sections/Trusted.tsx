"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { trusted } from "@/lib/data";
import SectionHeader from "@/components/SectionHeader";

export default function Trusted() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <section id="trusted" className="py-24 px-6 lg:px-10 bg-paper-soft">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          label={trusted.label}
          heading={trusted.heading}
          center
        />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-12 mt-12">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="rounded-[2rem] border border-ink/10 bg-paper shadow-[0_30px_80px_-55px_rgba(0,0,0,0.35)] p-10"
          >
            <div className="flex items-start gap-6">
              <span className="text-[5rem] leading-[0.8] text-gold font-display">“</span>
              <div>
                <blockquote className="font-display italic text-2xl sm:text-3xl lg:text-[2.6rem] leading-[1.2] text-ink font-semibold">
                  {trusted.featured.quote}
                </blockquote>
                <cite className="not-italic mt-8 block border-t border-ink/10 pt-6">
                  <strong className="block text-2xl text-gold font-semibold mb-2">
                    {trusted.featured.name}
                  </strong>
                  <span className="text-[0.75rem] tracking-[0.24em] uppercase text-muted font-medium">
                    {trusted.featured.role}
                  </span>
                </cite>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {trusted.others.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                className="rounded-[2rem] border border-ink/10 bg-cream/90 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink font-semibold uppercase tracking-[0.2em]">
                    {item.name
                      .split(" ")
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink mb-1">
                      {item.name}
                    </div>
                    <div className="text-[0.72rem] uppercase tracking-[0.22em] text-muted">
                      {item.role}
                    </div>
                  </div>
                </div>
                <blockquote className="font-display italic text-lg leading-[1.6] text-ink font-medium">
                  {item.quote}
                </blockquote>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
