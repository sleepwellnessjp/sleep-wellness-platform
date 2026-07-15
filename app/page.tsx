import Hero from "@/components/Hero";
import About from "@/components/About";
import Programs from "@/components/Programs";
import SleepAnalysis from "@/components/SleepAnalysis";
import Academy from "@/components/Academy";
import Corporate from "@/components/Corporate";
import Founder from "@/components/Founder";
import Partners from "@/components/Partners";
import Media from "@/components/Media";
import News from "@/components/News";
import Vision from "@/components/Vision";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Hero />
      <About />
      <Programs />
      <SleepAnalysis />
      <Academy />
      <Corporate />
      <Founder />
      <Partners />
      <Media />
      <News />
      <Vision />
      <Contact />
      <Footer />
    </main>
  );
}