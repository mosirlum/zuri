/**
 * ================================================================
 *  ZURI TOURS — ALL SITE CONTENT
 * ================================================================
 *
 *  Edit any text on the site from THIS FILE.
 *
 *  RULES:
 *   - Keep the "quotation marks" around all text
 *   - Keep the commas at end of lines
 *   - For *highlighted text*, wrap in asterisks → renders in gold italic
 *
 *  IMAGE FILE NAMES (drop in /public/images/):
 *   • Logo:           zuri-logo.png
 *   • Hero bg:        hero-bg.jpg     (LARGE — 2400x1600+)
 *   • About:          about-team.jpg  (800x1000 portrait)
 *   • Services:       service-car-hire.jpg, service-airport.jpg,
 *                     service-executive.jpg, service-staff.jpg,
 *                     service-wedding.jpg, service-safari.jpg
 *   • Fleet:          fleet-landcruiser.jpg, fleet-coaster.jpg,
 *                     fleet-sorento.jpg, fleet-hiace.jpg, fleet-prado.jpg
 * ================================================================
 */

// === 1. COMPANY INFO ===
export const company = {
  name: "Zuri",
  fullName: "Zuri Tours & Car Hire",
  tagline: "Car Hire · Tanzania",
  description:
    "Premium car rental and professional transport services in Tanzania. Driven by Excellence. Trusted for Safety.",
  foundedYear: 2020,
  // WhatsApp: country code + number, NO spaces, NO +
  whatsapp: "255719111311",
  phone: "0719 111 311",
  phoneDial: "0719111311",
  email: "info@zuritours.co.tz",
  address: {
    line1: "Plot No 85, Block A2",
    line2: "Mikocheni Light Industrial Area",
    city: "Dar es Salaam, Tanzania",
  },
  workingHours: "Mon – Sat · 7:00 – 19:00",
  workingHoursNote: "Emergency dispatch 24/7",
  // Coordinates for Google Map
  mapEmbed:
    "https://www.google.com/maps?q=-6.7631454,39.2379456&z=17&output=embed",
  // Your name as builder (appears in footer)
  builtBy: "YOUR_NAME",
};

// === 2. NAVIGATION ===
export const navigation = [
  { label: "Services", href: "#services" },
  { label: "Fleet", href: "#fleet" },
  { label: "About", href: "#about" },
  { label: "Trusted", href: "#trusted" },
  { label: "Contact", href: "#contact" },
];

// === 3. HERO ===
export const hero = {
  eyebrow: "Est. 2020 · Mikocheni, Dar es Salaam",
  // *asterisks* = gold italic highlight
  headline: "Premium *car hire* &<br/>professional transport<br/>in *Tanzania.*",
  subline:
    "Self-drive or chauffeured. Airport transfers, executive transport, weddings, corporate fleets, safari vehicles. Modern fleet. Licensed drivers. Transparent pricing.",
  primaryCta: { label: "Explore Fleet", href: "#fleet" },
  secondaryCta: { label: "Get a Quote", href: "#contact" },
  stats: [
    { value: 2400, label: "Trips Done", suffix: "+" },
    { value: 50, label: "Repeat Clients", suffix: "+" },
    { value: 30, label: "Vehicles", suffix: "+" },
    { value: 6, label: "Services", suffix: "" },
  ],
};

// === 4. MARQUEE STRIP ===
export const marqueeItems = [
  "Car Hire",
  "Airport Transfers",
  "Executive Transport",
  "Wedding Cars",
  "Staff Shuttles",
  "Safari Vehicles",
  "Corporate Events",
  "VIP Transport",
];

// === 5. SERVICES ===
export const services = {
  label: "What We Offer",
  heading: "Our *Services*",
  intro: "Choose a service card below to uncover the matching vehicle and learn how it fits your trip.",
  items: [
    {
      num: "01",
      title: "Car *Hire*",
      desc: "Self-drive or chauffeured. Daily, weekly, monthly.",
      image: "/images/car hire.jpg",
      label: "Car Hire",
    },
    {
      num: "02",
      title: "Airport *Transfers*",
      desc: "Flight-tracked pickups. Always on time.",
      image: "/images/airport transfer.jpg",
      label: "Airport Transfers",
    },
    {
      num: "03",
      title: "*Executive* Transport",
      desc: "Discreet, premium service for VIPs.",
      image: "/images/executive transport.jpg",
      label: "Executive Transport",
    },
    {
      num: "04",
      title: "Staff *Transport*",
      desc: "Reliable daily shuttles for organizations.",
      image: "/images/staff_transport.jpg",
      label: "Staff Transportation",
    },
    {
      num: "05",
      title: "VIP & *Wedding*",
      desc: "Premium fleet for once-in-a-lifetime moments.",
      image: "/images/vip_wedding.jpg",
      label: "VIP & Wedding",
    },
    {
      num: "06",
      title: "Tours & *Safari*",
      desc: "Serengeti, Ngorongoro, Zanzibar. Expert drivers.",
      image: "/images/tours_safari.jpg",
      label: "Tours & Safari",
    },
  ],
};

// === 6. FLEET ===
export const fleetFilters = ["All", "Executive", "Group", "4×4"];

export const fleet = {
  label: "Our Collection",
  heading: "Modern fleet,<br/>*every occasion.*",
  intro: "Five vehicles. Each maintained meticulously. Each ready when you are.",
  items: [
    {
      category: "Executive",
      badge: "★ Most Booked",
      tag: "VIP · Safari",
      name: "Toyota *Land Cruiser V8*",
      specs: "7 seats · 4WD · Auto · A/C",
      image: "/images/v8.jpg",
      size: "large", // big card
    },
    {
      category: "Group",
      badge: "Group",
      tag: "Group · Events",
      name: "Toyota *Coaster*",
      specs: "26 seats · A/C · Cargo",
      image: "/images/toyota-coaster.jpeg",
      size: "tall", // tall portrait card
    },
    {
      category: "Executive",
      badge: "Corporate",
      tag: "Executive",
      name: "Kia *Sorento*",
      specs: "5 seats · Auto · A/C",
      image: "/images/kia sorento.jpg",
      size: "small",
    },
    {
      category: "Group",
      badge: "Mid-Group",
      tag: "Mid-group",
      name: "Toyota *Hiace*",
      specs: "14 seats · A/C · Luggage",
      image: "/images/toyota-hiace.jpg",
      size: "small",
    },
    {
      category: "4×4",
      badge: "Safari 4×4",
      tag: "Safari · Family",
      name: "Toyota *Prado*",
      specs: "5 seats · 4WD · A/C",
      image: "/images/landcruiser prado.jpg",
      size: "small",
    },
  ],
};

// === 7. ABOUT ===
export const about = {
  label: "Who We Are",
  heading: "A small house,<br/>*built on trust.*",
  image: "/images/about.jpg",
  paragraphs: [
    "Founded in 2020, Zuri Tours & Car Hire was created to offer dependable, professional transport services tailored to individuals, businesses, and visitors across Tanzania. Six years later, our promise has not changed.",
    "We operate out of one office in Mikocheni, Dar es Salaam. We answer our own phone. We service our own vehicles. We know our drivers by name — and they know our clients by name in return.",
  ],
  pullquote:
    "Our mission is simple — to move people *safely*, *comfortably*, and on time.",
  closer:
    "— Driven by excellence. Trusted for safety. We are not the largest car hire in Dar. We intend to be the one you choose when it matters.",
};

// === 8. MISSION & VISION ===
export const mvision = {
  mission: {
    label: "Our Mission",
    letter: "M",
    heading:
      "To move people *safely, comfortably,* and on time — every single journey.",
    text: "Whether it's a fifteen-minute airport pickup or a multi-day safari, we approach each booking with the same care. Punctuality without excuse. Comfort without compromise.",
    footer: "— Since 2020, every day.",
  },
  vision: {
    label: "Our Vision",
    letter: "V",
    heading:
      "To be Tanzania's most *trusted* name in car hire and professional transport.",
    text: "Not the largest. The most considered. The one chosen for moments that matter — weddings, executive visits, family safaris, important journeys.",
    footer: "— What we wake up for.",
  },
};

// === 9. TRUSTED BY (testimonials only — no duplicate logos) ===
export const trusted = {
  label: "Trusted By",
  heading: "What our clients *say*.",
  featured: {
    quote:
      "Zuri Tours has been handling our staff transport professionally and on time. Their drivers are reliable and the vehicles are always clean and well maintained.",
    name: "NIT",
    role: "National Institute of Transport",
  },
  others: [
    {
      quote:
        "We used Zuri Tours for airport transfers and event transport. The service was smooth, punctual, and very professional.",
      name: "Bahari Beach",
      role: "Roman Catholic Parish",
    },
    {
      quote:
        "Excellent customer service and flexible arrangements. I highly recommend Zuri Tours for corporate and private transport needs.",
      name: "KKT Boko",
      role: "Community Coordinator",
    },
    {
      quote:
        "Six years working with Zuri — never once been late. Not an exaggeration. That's why we keep coming back.",
      name: "Long-Term Client",
      role: "Industrial Sector",
    },
  ],
};

// === 10. FAQ ===
export const faq = {
  label: "Frequently Asked",
  heading: "Common *questions.*<br/>Plain answers.",
  intro: "Don't see your question? Just call us — we answer the phone ourselves.",
  items: [
    {
      q: "What if my flight is delayed?",
      a: "We track your flight in real time. If it's delayed, your driver waits — no extra charge for reasonable delays. If your flight is cancelled or rescheduled to another day, just send us a WhatsApp message and we'll rearrange. Stress-free.",
    },
    {
      q: "Do you travel up-country outside Dar?",
      a: "Yes. We arrange up-country trips regularly — Arusha, Moshi, Mwanza, Iringa, the southern and northern safari circuits. Quotes include the driver's accommodation, fuel, and any park fees relevant to your route. Multi-day rates available.",
    },
    {
      q: "How quickly can I get a vehicle?",
      a: "Same-day if you call before noon. Next-day for evening bookings. For airport pickups, just give us your flight details ahead of time. Long-term contracts (week, month, corporate) — we usually confirm within hours.",
    },
    {
      q: "Do you accept M-Pesa or mobile money?",
      a: "Yes — M-Pesa, Tigo Pesa, Airtel Money, and bank transfer. For corporate clients, we issue invoices on agreed credit terms. Cash accepted but not preferred for security reasons.",
    },
    {
      q: "What if the car breaks down mid-trip?",
      a: "Rare — but if it happens, we dispatch a replacement vehicle immediately. Our fleet is comprehensively maintained and inspected before every long trip. For up-country and safari travel, we follow strict pre-trip checks specifically to prevent this.",
    },
  ],
};

// === 11. CONTACT ===
export const contact = {
  label: "Get In Touch",
  heading: "Ready to *reserve?*",
  intro: "Fill in the form, or reach us directly by phone, WhatsApp, or in person.",
  serviceOptions: [
    "Car Hire",
    "Airport Transfer",
    "Executive Transport",
    "Staff Transportation",
    "VIP / Wedding",
    "Tours / Safari",
    "General Inquiry",
  ],
};

// === 12. FOOTER ===
export const footerLinks = {
  services: [
    { label: "Car Hire", href: "#services" },
    { label: "Airport Transfers", href: "#services" },
    { label: "Executive Transport", href: "#services" },
    { label: "VIP & Wedding", href: "#services" },
    { label: "Tours & Safari", href: "#services" },
  ],
  company: [
    { label: "About", href: "#about" },
    { label: "Fleet", href: "#fleet" },
    { label: "Trusted", href: "#trusted" },
    { label: "Contact", href: "#contact" },
  ],
};

// === 13. SEO ===
export const seo = {
  title:
    "Zuri Tours & Car Hire — Premium Car Rental, Dar es Salaam | Tanzania",
  description:
    "Premium car hire and professional transport in Tanzania. Self-drive or chauffeured. Airport transfers, executive, wedding, safari. Based in Dar es Salaam since 2020.",
  keywords:
    "car hire Dar es Salaam, car rental Tanzania, airport transfer Tanzania, executive transport, wedding car Dar, safari vehicles Tanzania, Zuri Tours",
  url: "https://zuritours.co.tz",
};
