import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import InstructorsCta from "@/components/InstructorsCta";
import Partners from "@/components/Partners";
import Founder from "@/components/Founder";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import HomeSchedulesSection from "@/components/instructor-activity-schedules/HomeSchedulesSection";
import { listHomeActivitySchedules } from "@/lib/instructor-activity-schedules/service";

export default async function Home() {
  const activitySchedules = await listHomeActivitySchedules(6);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Hero />
      <About />
      <Services />
      <InstructorsCta />
      <HomeSchedulesSection schedules={activitySchedules} />
      <Partners />
      <Founder />
      <Contact />
      <Footer />
    </main>
  );
}
