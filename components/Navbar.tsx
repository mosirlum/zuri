"use client";

/**
 * NAVBAR
 * ------
 * Sticky glass nav with the Zuri logo.
 *
 * LOGO SETUP:
 *  - The navbar shows the round EMBLEM (/images/zuri-emblem.png)
 *    plus a "ZURI TOURS" text wordmark beside it.
 *  - The emblem is used (not the full stacked logo) because the
 *    full logo's text becomes unreadable at small navbar height.
 *  - The full logo with tagline is used in the Footer instead.
 *
 * TO SWAP LOGOS LATER:
 *  - Round mark for navbar:  /public/images/zuri-emblem.png
 *  - Full logo for footer:   /public/images/zuri-logo.png
 *    (transparent PNGs blend best with the cream background)
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navigation } from "@/lib/data";

const EMBLEM_SRC = "/images/zuri-emblem.png";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 bg-paper/90 backdrop-blur-xl border-b border-ink/10 transition-all ${
          scrolled ? "py-2 px-10" : "py-3 px-10"
        } flex justify-between items-center max-md:px-5 max-md:py-2.5`}
      >
        {/* LOGO — emblem + wordmark */}
        <a
          href="#"
          className="flex items-center gap-3 group"
          aria-label="Zuri Tours & Car Hire"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={EMBLEM_SRC}
            alt="Zuri Tours & Car Hire emblem"
            className={`w-auto object-contain transition-all duration-300 group-hover:scale-[1.04] ${
              scrolled ? "h-12" : "h-14"
            } max-md:h-11`}
          />
          <div className="flex flex-col leading-none">
            <span className="font-display font-semibold text-2xl max-md:text-xl tracking-tight text-ink">
              ZURI TOURS
            </span>
            <span className="text-[0.62rem] max-md:text-[0.55rem] tracking-[0.25em] uppercase font-semibold text-gold/80 mt-1">
  &amp; Car Hire · Tanzania
</span>
          </div>
        </a>

        {/* Desktop links */}
        <ul className="hidden lg:flex gap-10 list-none">
          {navigation.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="relative text-[0.78rem] tracking-[0.12em] uppercase font-semibold text-ink hover:text-gold transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-0 after:h-px after:bg-gold hover:after:w-full after:transition-all"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className="hidden sm:inline-flex bg-ink text-paper px-6 py-3 text-[0.72rem] tracking-[0.2em] uppercase font-semibold border border-ink hover:bg-gold hover:border-gold transition-all"
          >
            Get a Quote
          </a>

          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden p-2 text-ink"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile fullscreen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-ink text-paper overflow-y-auto"
          >
            <div className="flex justify-between items-center px-5 py-4 border-b border-paper/10">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={EMBLEM_SRC}
                  alt="Zuri Tours & Car Hire"
                  className="h-11 w-auto object-contain"
                />
                <span className="font-display font-semibold text-xl tracking-tight">
                  ZURI TOURS
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
                className="p-2"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <ul className="flex flex-col p-6 mt-4">
              {navigation.map((item, i) => (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-5 font-display text-3xl font-semibold border-b border-paper/10 hover:text-gold transition-colors"
                  >
                    {item.label}
                  </a>
                </motion.li>
              ))}
            </ul>

            <div className="p-6">
              <a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                className="block text-center bg-gold text-ink py-4 font-semibold tracking-[0.15em] uppercase text-sm"
              >
                Get a Quote
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
