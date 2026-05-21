# Zuri Tours &amp; Car Hire — Website

Production website built with Next.js 14, TypeScript, Tailwind CSS, Framer Motion.

> **You're not a developer? That's fine.** This guide walks you through running it, editing text, adding photos, and deploying it online.

---

## 📦 Quick Start

### 1. Install Node.js (one time)

Download from https://nodejs.org — pick the **LTS** version (green button).

### 2. Open this folder in a terminal

- **Windows:** Right-click the `zuri` folder → "Open in Terminal"
- **Mac:** Right-click → "New Terminal at Folder"

### 3. Install dependencies

```bash
npm install
```

(Takes 2–3 minutes. You'll see warnings — that's normal.)

### 4. Run the site locally

```bash
npm run dev
```

Open http://localhost:3000 — your site is live on your computer.

> Press `Ctrl + C` in terminal to stop. Run `npm run dev` again to restart.

---

## ✏️ Edit any text on the site

**All text lives in one file: `lib/data.ts`**

Find the section you want to change. Edit the text inside the quotation marks. Save. The site auto-refreshes.

### Rules:
- Keep the `"quotation marks"` around text
- Keep the commas `,` at the end of lines
- For **gold italic highlights** inside a heading, wrap text in `*asterisks*`
  - Example: `"Premium *car hire* in Tanzania"` → "Premium *car hire* in Tanzania"
- For line breaks inside a heading, use `<br/>`
  - Example: `"Line one<br/>Line two"`

### What you can edit in `lib/data.ts`:
1. **Company info** — name, phone, email, WhatsApp, address
2. **Navigation** — top menu links
3. **Hero** — headline, sub-text, stats
4. **Marquee** — the scrolling words below hero
5. **Services** — all 6 service cards
6. **Fleet** — vehicle names, specs, categories
7. **About** — story paragraphs, pullquote
8. **Mission &amp; Vision** — texts
9. **Trusted By** — testimonials
10. **FAQ** — all questions and answers
11. **Contact** — form options
12. **Footer** — links and credits
13. **SEO** — browser tab title, Google search appearance

---

## 📸 Replace placeholder images with real photos

The site shows decorative placeholders until you drop in real photos.

### Where to drop photos: `/public/images/`

| What | Filename | Size |
|---|---|---|
| Logo | `zuri-logo.png` | Square, 80×80+ |
| Hero background | `hero-bg.jpg` | Landscape, 2400×1600+ |
| About photo | `about-team.jpg` | Portrait, 800×1000 |
| Service: Car Hire | `service-car-hire.jpg` | Portrait, 600×750 |
| Service: Airport | `service-airport.jpg` | Portrait, 600×750 |
| Service: Executive | `service-executive.jpg` | Portrait, 600×750 |
| Service: Staff | `service-staff.jpg` | Portrait, 600×750 |
| Service: Wedding | `service-wedding.jpg` | Portrait, 600×750 |
| Service: Safari | `service-safari.jpg` | Portrait, 600×750 |
| Fleet: Land Cruiser | `fleet-landcruiser.jpg` | Landscape, 1200×750 |
| Fleet: Coaster | `fleet-coaster.jpg` | Portrait, 800×1000 |
| Fleet: Sorento | `fleet-sorento.jpg` | Landscape, 1200×750 |
| Fleet: Hiace | `fleet-hiace.jpg` | Landscape, 1200×750 |
| Fleet: Prado | `fleet-prado.jpg` | Landscape, 1200×750 |

### After adding the hero image:

Open `components/sections/Hero.tsx`. Find this line near the top:

```ts
const HAS_HERO_IMAGE = false;
```

Change it to:

```ts
const HAS_HERO_IMAGE = true;
```

Save. The placeholder is replaced with your photo.

### After adding the logo:

Open `components/Navbar.tsx`. Find this line:

```ts
const LOGO_SRC: string | null = null;
```

Change to:

```ts
const LOGO_SRC: string | null = "/images/zuri-logo.png";
```

Save. The "Z" placeholder is replaced with your logo.

> Service and Fleet photos load **automatically** as soon as you drop them at the exact filename. No code change needed.

---

## 🎨 Change colors

Open `tailwind.config.ts`. Find this block:

```ts
colors: {
  paper: "#faf7f1",
  ink: "#1c1814",
  gold: { DEFAULT: "#b8843a", deep: "#8a5f24" },
  // ...
}
```

Change any `#xxxxxx` value, save, and the entire site updates.

---

## 🚀 Deploy online (Vercel — free)

### 1. Create a Vercel account
Go to https://vercel.com → sign up with GitHub or email.

### 2. Install Vercel CLI
```bash
npm install -g vercel
```

### 3. Deploy
```bash
vercel
```

Answer the prompts (press Enter to accept defaults). After ~2 minutes you'll get a URL like `https://zuri-abc.vercel.app` — your site is online!

### 4. Push updates later
After editing anything:
```bash
vercel --prod
```

---

## 📁 Project Structure

```
zuri/
├── app/
│   ├── layout.tsx       ← Fonts &amp; SEO (rarely edit)
│   ├── page.tsx         ← Section order (edit to reorder)
│   └── globals.css      ← Base styles
│
├── components/
│   ├── Navbar.tsx       ← Top nav with logo slot
│   ├── Footer.tsx       ← Footer with builder credit
│   ├── TopStrip.tsx     ← Black bar at top
│   ├── FloatingActions  ← WhatsApp + Call buttons
│   ├── Counter.tsx      ← Animated number counter
│   ├── Highlight.tsx    ← Gold italic *text* helper
│   ├── SectionHeader.tsx
│   └── sections/        ← Each page section
│       ├── Hero.tsx
│       ├── Marquee.tsx
│       ├── Services.tsx
│       ├── Fleet.tsx
│       ├── About.tsx
│       ├── MissionVision.tsx
│       ├── Trusted.tsx
│       ├── FAQ.tsx
│       └── Contact.tsx
│
├── lib/
│   └── data.ts          ← ⭐ ALL TEXT HERE
│
├── public/
│   └── images/          ← Drop photos here
│
├── package.json         ← Don't edit
├── tailwind.config.ts   ← Brand colors here
└── README.md            ← You are here
```

---

## 🆘 Common issues

**Site won't start** → Check terminal for the error line. Usually a missing comma in `lib/data.ts`.

**Photo doesn't show up** → Check the filename matches exactly (case-sensitive). Make sure it's inside `/public/images/`.

**Build fails on deploy** → Run `npm run build` locally first. It'll show you the exact line that broke.

**Want to change something not covered here** → Tell your developer/builder the exact section &amp; what you want changed. The file structure makes it easy for them to find.

---

## 🛠 Built with

- **Next.js 14** — React framework
- **TypeScript** — Type-safe code
- **Tailwind CSS** — Utility styling
- **Framer Motion** — Animations
- **GSAP** — Advanced motion (available)
- **Lucide React** — Icons
- **Cormorant Garamond + Manrope** — Typography

---

**Designed &amp; built with care for Zuri Tours &amp; Car Hire**
Karibu sana.
