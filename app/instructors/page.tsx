import type { Metadata } from "next";
import Footer from "@/components/Footer";
import InstructorPublicShell from "@/components/instructors/InstructorPublicShell";
import InstructorsDirectory from "@/components/instructors/InstructorsDirectory";
import { mergePublicInstructorsWithRoster } from "@/lib/instructors/certified-roster";
import { listPublicInstructors } from "@/lib/instructors/instructor-profile-service";
import {
  CERTIFIED_INSTRUCTOR_TITLE,
  type InstructorPublicCard,
} from "@/lib/instructors/types";

export const metadata: Metadata = {
  title: `${CERTIFIED_INSTRUCTOR_TITLE} | Sleep Wellness Institute Japan`,
  description:
    "メラトニンヨガ™認定講師の一覧。名前から認定講師を探せます。",
};

export const dynamic = "force-dynamic";

export default async function InstructorsPage() {
  let instructors: InstructorPublicCard[] = [];

  try {
    instructors = await listPublicInstructors();
  } catch (error) {
    console.error("[instructors page]", error);
    instructors = mergePublicInstructorsWithRoster([]);
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

        <div className="mt-10">
          <InstructorsDirectory initialInstructors={instructors} />
        </div>
      </main>
      <Footer />
    </InstructorPublicShell>
  );
}
