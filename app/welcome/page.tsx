import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import InstructorsCta from "@/components/InstructorsCta";
import Partners from "@/components/Partners";
import Founder from "@/components/Founder";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

/**
 * ブランド向け公開ランディング（SWIJ 紹介）。
 * プロダクト入口は `/`（ログイン／ロール別ホームへ誘導）。
 */
export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Hero />
      <About />
      <Services />
      <InstructorsCta />
      <Partners />
      <Founder />
      <Contact />
      <Footer />
    </main>
  );
}
