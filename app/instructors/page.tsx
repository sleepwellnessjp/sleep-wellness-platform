import type { Metadata } from "next";
import Footer from "@/components/Footer";
import InstructorPublicShell from "@/components/instructors/InstructorPublicShell";
import InstructorsDirectory from "@/components/instructors/InstructorsDirectory";
import { listPublicInstructors } from "@/lib/instructors/instructor-profile-service";
import {
  CERTIFIED_INSTRUCTOR_TITLE,
  type InstructorPublicCard,
} from "@/lib/instructors/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: `${CERTIFIED_INSTRUCTOR_TITLE} | Sleep Wellness Institute Japan`,
  description:
    "メラトニンヨガ™認定講師の一覧。活動地域・オンライン対応・指導分野から認定講師を探せます。",
};

export const dynamic = "force-dynamic";

export default async function InstructorsPage() {
  let instructors: InstructorPublicCard[] = [];
  let loadError: string | null = null;

  if (!isSupabaseConfigured()) {
    loadError = "現在、講師一覧を表示できません。";
  } else {
    try {
      instructors = await listPublicInstructors();
    } catch (error) {
      console.error("[instructors page]", error);
      loadError =
        error instanceof Error
          ? error.message
          : "講師一覧の取得に失敗しました。";
      instructors = [];
    }
  }

  return (
    <InstructorPublicShell>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
            CERTIFIED INSTRUCTORS
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#071426] sm:text-4xl lg:text-5xl">
            メラトニンヨガ™認定講師
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Sleep Wellness Institute Japan
            が認定する講師をご紹介します。医療行為ではなく、睡眠ウェルネスの実践を支える認定講師です。
          </p>
        </div>

        {loadError ? (
          <div className="mt-10 rounded-[24px] border border-[#a33a3a]/20 bg-white px-5 py-4 text-sm text-[#a33a3a]">
            {loadError}
            {loadError.includes("column") || loadError.includes("does not exist")
              ? " — supabase/instructor-public-profiles.sql を SQL Editor で実行してください。"
              : null}
          </div>
        ) : null}

        <div className="mt-10">
          <InstructorsDirectory initialInstructors={instructors} />
        </div>
      </main>
      <Footer />
    </InstructorPublicShell>
  );
}
