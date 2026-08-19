import Hero from "@/components/Hero";
import HomeIntro from "@/components/HomeIntro";
import HomeIntroBridge from "@/components/HomeIntroBridge";
import MySleepSection from "@/components/home/MySleepSection";
import SleepWordsBanner from "@/components/home/SleepWordsBanner";
import About from "@/components/About";
import Services from "@/components/Services";
import InstructorsCta from "@/components/InstructorsCta";
import Partners from "@/components/Partners";
import Founder from "@/components/Founder";
import Contact from "@/components/Contact";
import HomeActivitiesSection from "@/components/instructor-activities/HomeActivitiesSection";
import HomeSchedulesSection from "@/components/instructor-activity-schedules/HomeSchedulesSection";
import Footer from "@/components/Footer";
import { listHomeFeaturedActivities } from "@/lib/instructor-activities/service";
import { listHomeActivitySchedules } from "@/lib/instructor-activity-schedules/service";
import { homePathForRole } from "@/lib/safe-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Sleep Wellness Institute Japan の一般向けトップページ。
 * 認定講師専用の導線はハンバーガーメニューと Method セクションへ集約する。
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

  const featuredActivities = await listHomeFeaturedActivities(4);
  const activitySchedules = await listHomeActivitySchedules(6);

  return (
    <main id="top" className="min-h-screen bg-[#071426] text-white">
      <HomeIntro />
      <HomeIntroBridge />
      <div className="max-sm:flex max-sm:min-h-[100dvh] max-sm:flex-col">
        <Hero />
        <MySleepSection
          analysisHref={
            dashboardHref
              ? "/analysis/new"
              : "/login?redirect=%2Fanalysis%2Fnew"
          }
        />
        <div className="max-sm:shrink-0 px-5 pb-[calc(var(--sw-sleep-tabbar-clearance)+0.5rem)] pt-1 sm:px-8 sm:pb-10 sm:pt-2 lg:px-10">
          <SleepWordsBanner tone="onDark" />
        </div>
      </div>
      <About
        analysisHref={
          dashboardHref
            ? "/analysis/new"
            : "/login?redirect=%2Fanalysis%2Fnew"
        }
      />
      <Services />
      <InstructorsCta />
      <HomeActivitiesSection activities={featuredActivities} />
      <HomeSchedulesSection schedules={activitySchedules} />
      <Partners />
      <Founder />
      <Contact />
      <Footer />
    </main>
  );
}
