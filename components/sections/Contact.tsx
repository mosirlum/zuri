"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ArrowRight } from "lucide-react";
import { contact, company } from "@/lib/data";
import SectionHeader from "@/components/SectionHeader";

export default function Contact() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: contact.serviceOptions[0],
    message: "",
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = [
      `*Zuri Quote Request*`,
      `Name: ${formData.name}`,
      `Email: ${formData.email}`,
      `Phone: ${formData.phone}`,
      `Service: ${formData.service}`,
      ``,
      formData.message,
    ].join("%0A");
    window.open(`https://wa.me/${company.whatsapp}?text=${text}`, "_blank");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <section id="contact" className="py-24 px-6 lg:px-10 bg-paper-soft">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          label={contact.label}
          heading={contact.heading}
          intro={contact.intro}
          center
        />

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-start"
        >
          {/* Contact info */}
          <div className="flex flex-col gap-7">
            <ContactRow
              label="Address"
              value={
                <>
                  {company.address.line1}
                  <br />
                  <em className="not-italic font-display italic text-gold">
                    {company.address.line2}
                  </em>
                  <br />
                  {company.address.city}
                </>
              }
              href="#contact"
            />
            <ContactRow
              label="Phone"
              value={company.phone}
              href={`tel:${company.phoneDial}`}
            />
            <ContactRow
              label="Email"
              value={company.email}
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${company.email}`}
            />
            <ContactRow
              label="WhatsApp"
              value="Send us a message"
              href={`https://wa.me/${company.whatsapp}`}
              external
            />
            <div className="pb-6">
              <div className="text-[0.7rem] tracking-[0.25em] uppercase text-muted mb-2 font-medium">
                Working Hours
              </div>
              <div className="font-display text-xl text-ink leading-tight">
                {company.workingHours}
                <br />
                <span className="text-xs tracking-[0.1em] uppercase text-muted">
                  {company.workingHoursNote}
                </span>
              </div>
            </div>

            {/* Map */}
            <div className="aspect-[16/10] bg-cream overflow-hidden border border-ink/10 mt-2">
              <iframe
                src={company.mapEmbed}
                className="w-full h-full"
                style={{ filter: "grayscale(0.2) sepia(0.1)" }}
                loading="lazy"
                title="Zuri office"
              />
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-paper p-8 lg:p-10 border border-ink/10"
          >
            <h3 className="font-display text-3xl font-medium mb-2">
              Send a Message
            </h3>
            <p className="text-muted text-sm mb-8">We respond within hours.</p>

            {submitted ? (
              <div className="text-center py-12">
                <div className="font-display text-5xl text-gold mb-4">✓</div>
                <h4 className="font-display text-2xl mb-2">Opening WhatsApp</h4>
                <p className="text-muted">
                  We&apos;ll respond shortly. Asante sana.
                </p>
              </div>
            ) : (
              <>
                <FormField
                  label="Full Name *"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(v) => setFormData({ ...formData, name: v })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <FormField
                    label="Email *"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(v) => setFormData({ ...formData, email: v })}
                    nomb
                  />
                  <FormField
                    label="Phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(v) => setFormData({ ...formData, phone: v })}
                    nomb
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-[0.7rem] tracking-[0.25em] uppercase text-muted mb-2 font-medium">
                    Service Needed
                  </label>
                  <select
                    value={formData.service}
                    onChange={(e) =>
                      setFormData({ ...formData, service: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-ink/10 py-3 text-base text-ink outline-none focus:border-gold transition-colors"
                  >
                    {contact.serviceOptions.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-8">
                  <label className="block text-[0.7rem] tracking-[0.25em] uppercase text-muted mb-2 font-medium">
                    Message *
                  </label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    rows={4}
                    className="w-full bg-transparent border-b border-ink/10 py-3 text-base text-ink outline-none focus:border-gold transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-ink text-paper py-4 text-[0.72rem] tracking-[0.2em] uppercase font-medium hover:bg-gold transition-colors flex items-center justify-center gap-3 group"
                >
                  Send Message
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </>
            )}
          </form>
        </motion.div>
      </div>
    </section>
  );
}

function ContactRow({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: React.ReactNode;
  href: string;
  external?: boolean;
}) {
  return (
    <div className="pb-6 border-b border-ink/10">
      <div className="text-[0.7rem] tracking-[0.25em] uppercase text-muted mb-2 font-medium">
        {label}
      </div>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="font-display text-xl text-ink hover:text-gold transition-colors block leading-tight"
      >
        {value}
      </a>
    </div>
  );
}

function FormField({
  label,
  type,
  required,
  value,
  onChange,
  nomb,
}: {
  label: string;
  type: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  nomb?: boolean;
}) {
  return (
    <div className={nomb ? "" : "mb-6"}>
      <label className="block text-[0.7rem] tracking-[0.25em] uppercase text-muted mb-2 font-medium">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-ink/10 py-3 text-base text-ink outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}
