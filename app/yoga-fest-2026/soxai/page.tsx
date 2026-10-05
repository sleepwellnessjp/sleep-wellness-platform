import type { Metadata } from "next";
import Footer from "@/components/Footer";
import SoxaiStudyPageContent from "@/components/yoga-fest-2026/SoxaiStudyPageContent";
import InstructorPublicShell from "@/components/instructors/InstructorPublicShell";

export const metadata: Metadata = {
  title:
    "ヨガフェスタ横浜2026 スマートリング検証実験 参加登録 | Sleep Wellness Institute Japan",
  description:
    "ヨガフェスタ横浜2026におけるSOXAIスマートリング検証実験の参加登録ページです。",
};

export default function YogaFest2026SoxaiPage() {
  return (
    <InstructorPublicShell
      title="YOGA FEST 2026 SOXAI"
      titleHref="/yoga-fest-2026/soxai"
    >
      <main className="mx-auto max-w-3xl px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-14 sm:pb-14">
        <SoxaiStudyPageContent />
      </main>
      <Footer />
    </InstructorPublicShell>
  );
}
