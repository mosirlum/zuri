"use client";

import { motion } from "framer-motion";
import { hero } from "@/lib/data";
import Highlight from "@/components/Highlight";
import Counter from "@/components/Counter";

const HERO_IMAGE_PATH = "/images/hero-bg.jpg";

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-start bg-ink overflow-hidden py-10"
    >
      {/* === CAR IMAGE (right side) === */}
      <img
        src={HERO_IMAGE_PATH}
        alt="Premium car hire vehicle"
        className="absolute right-0 inset-0 w-full h-full object-cover object-center md:w-[62%] md:object-left"
      />

      {/* === OVERLAY GRADIENT (heavy left, fade right) === */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/75 to-transparent" />

      {/* === CONTENT (left side) === */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 px-6 pb-14 max-w-[min(680px,85vw)] sm:px-10 md:px-14 md:max-w-[min(680px,40vw)]"
      >
        {/* Eyebrow */}
        <motion.div variants={itemVariants} className="mb-8">
          <span className="text-paper/80 text-[9px] tracking-[0.42em] uppercase">
            {hero.eyebrow}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="font-display text-[clamp(44px,4.8vw,76px)] font-light leading-[0.93] text-paper mb-8 [&_em.highlight]:font-semibold"
        >
          <Highlight text={hero.headline} />
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-[13px] text-paper/75 max-w-md mb-10 leading-relaxed"
        >
          {hero.subline}
        </motion.p>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="flex gap-6 mb-16 flex-wrap">
          <a
            href={hero.primaryCta.href}
            className="bg-gold text-ink px-8 py-3 text-[9px] tracking-[0.42em] uppercase font-semibold hover:bg-gold/90 transition-colors"
          >
            {hero.primaryCta.label}
          </a>
          <a
            href={hero.secondaryCta.href}
            className="text-paper/65 text-[9px] tracking-[0.42em] uppercase font-semibold border-b border-gold/40 hover:text-paper/85 transition-colors pb-1"
          >
            {hero.secondaryCta.label}
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 gap-x-6 gap-y-6 border-t border-gold/15 pt-8 sm:grid-cols-4"
        >
          {hero.stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`sm:border-r border-gold/15 ${index === hero.stats.length - 1 ? "sm:border-r-0" : ""} pr-6`}
            >
              <div className="font-display text-[36px] text-gold leading-none mb-3 font-light">
                <Counter
                  value={stat.value}
                  suffix={stat.suffix || ""}
                  isYear={false}
                />
              </div>
              <div className="text-[8px] tracking-[0.28em] uppercase text-paper/40 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
