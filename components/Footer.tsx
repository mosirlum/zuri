import { company, footerLinks } from "@/lib/data";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-paper text-ink px-6 lg:px-10 pt-16 pb-8 border-t border-ink/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.3fr] gap-10 pb-12 border-b border-ink/10">
        {/* Brand */}
        <div>
          {/* Logo — image already contains the wordmark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/zuri-logo.png"
            alt="Zuri Tours & Car Hire"
            className="h-20 w-auto object-contain mb-5"
          />
          <p className="text-muted text-sm leading-relaxed max-w-sm font-light">
            {company.description}
          </p>
          {/* Footer credit removed as requested */}
        </div>

        {/* Services */}
        <div>
          <h4 className="text-[0.7rem] tracking-[0.25em] uppercase text-gold font-semibold mb-5">
            Services
          </h4>
          <ul className="space-y-3">
            {footerLinks.services.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-sm text-ink-soft hover:text-gold transition-colors font-light"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-[0.7rem] tracking-[0.25em] uppercase text-gold font-semibold mb-5">
            Company
          </h4>
          <ul className="space-y-3">
            {footerLinks.company.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-sm text-ink-soft hover:text-gold transition-colors font-light"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-[0.7rem] tracking-[0.25em] uppercase text-gold font-semibold mb-5">
            Contact
          </h4>
          <ul className="space-y-3 text-sm text-ink-soft font-light">
            <li>{company.address.line1}</li>
            <li>{company.address.line2}</li>
            <li>{company.address.city}</li>
            <li className="pt-2">
              <a
                href={`tel:${company.phoneDial}`}
                className="hover:text-gold transition-colors"
              >
                {company.phone}
              </a>
            </li>
            <li>
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${company.email}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
              >
                {company.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 flex flex-wrap justify-between gap-4 text-[0.72rem] tracking-[0.15em] uppercase text-muted">
        <div>© {year} — Zuri Tours &amp; Car Hire Ltd</div>
        <div className="font-display italic text-base text-gold normal-case tracking-normal">
          Karibu sana — Asante kwa kutembelea.
        </div>
      </div>
    </footer>
  );
}
