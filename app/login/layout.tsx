import { Lato, Playfair_Display } from "next/font/google";
import "./login.css";

// The login page has its own type: Lato for the interface and Playfair
// Display for the brand name. next/font serves them from this site, so the
// Content-Security-Policy (fonts from 'self' only) is unaffected.
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], style: ["normal", "italic"], variable: "--font-lato", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-playfair", display: "swap" });

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${lato.variable} ${playfair.variable}`}>{children}</div>;
}
