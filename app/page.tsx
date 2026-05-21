import TopStrip from "@/components/TopStrip";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Services from "@/components/sections/Services";
import Fleet from "@/components/sections/Fleet";
import About from "@/components/sections/About";
import MissionVision from "@/components/sections/MissionVision";
import Trusted from "@/components/sections/Trusted";
import FAQ from "@/components/sections/FAQ";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <TopStrip />
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Services />
        <Fleet />
        <About />
        <MissionVision />
        <Trusted />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
