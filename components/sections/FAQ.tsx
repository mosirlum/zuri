"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { faq } from "@/lib/data";
import SectionHeader from "@/components/SectionHeader";

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="py-24 px-6 lg:px-10 bg-paper">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-20 items-start">
          <div>
            <SectionHeader
              label={faq.label}
              heading={faq.heading}
              intro={faq.intro}
            />
          </div>

          <div className="border-t border-ink/10">
            {faq.items.map((item, idx) => (
              <FAQItem
                key={idx}
                item={item}
                isOpen={openIdx === idx}
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQItem({
  item,
  isOpen,
  onClick,
}: {
  item: { q: string; a: string };
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-ink/10">
      <button
        onClick={onClick}
        className="w-full py-6 flex justify-between items-center text-left gap-4 font-display text-2xl font-medium hover:text-gold transition-colors"
      >
        <span>{item.q}</span>
        <span
          className={`font-display italic text-2xl text-gold transition-transform duration-300 flex-shrink-0 ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-6 max-w-2xl text-ink-soft leading-relaxed font-light">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
