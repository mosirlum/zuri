"use client";

import { motion } from "framer-motion";
import { Mail, Phone } from "lucide-react";
import { company } from "@/lib/data";

export default function FloatingActions() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 2, duration: 0.5, type: "spring" }}
      className="fixed bottom-6 right-3 sm:right-6 z-40 flex flex-col gap-3 items-end"
    >
      {/* Call */}
      <a
        href={`tel:${company.phoneDial}`}
        aria-label="Call us"
        className="relative w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
      >
        <span className="absolute inset-0 rounded-full bg-ink animate-float-pulse pointer-events-none" />
        <Phone className="w-5 h-5 relative" />
      </a>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/${company.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="relative inline-flex h-14 rounded-full bg-[#25d366] text-white px-3 sm:px-4 gap-2 items-center justify-center shadow-xl hover:scale-110 transition-transform max-w-[80vw] sm:max-w-none"
      >
        <span
          className="absolute inset-0 rounded-full animate-float-pulse pointer-events-none"
          style={{ background: "rgba(37, 211, 102, 0.25)" }}
        />
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 relative"
        >
          <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2 3 4.8 4.2 1.7.7 2.3.8 3.2.6.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 00-8.5 15.3L2 22l4.8-1.4A10 10 0 1012 2z" />
        </svg>
        <span className="relative text-xs uppercase tracking-[0.18em] font-semibold hidden sm:inline-block">
          WhatsApp
        </span>
      </a>

      {/* Email removed per request; use footer/contact email link to open Gmail compose */}
    </motion.div>
  );
}
