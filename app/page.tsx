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
import { homePathForRole } from "@/lib/safe-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Sleep Wellness Institute Japan の一般向けトップページ。
 * ログイン状態に関わらず表示し、ダッシュボードへは明示的な導線から進む。
 */
export default async function Home() {
  let dashboardHref: string | null = null;

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role =
        profile && typeof profile === "object" && "role" in profile
          ? String((profile as { role?: unknown }).role ?? "")
          : "";

      dashboardHref = homePathForRole(role || "instructor");
    }
  }

  const activitySchedules = await listHomeActivitySchedules(6);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Hero dashboardHref={dashboardHref} />
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
