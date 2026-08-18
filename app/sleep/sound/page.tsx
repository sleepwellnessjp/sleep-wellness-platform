import type { Metadata } from "next";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import SleepContentSection from "@/components/sleep-content/SleepContentSection";
import { listPublishedRestContentByKind } from "@/lib/sleep-content/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "入眠音 | Sleep Wellness",
  description: "心地よい入眠音楽と自然音で、穏やかな眠りへ導きます。",
};

export default async function SleepSoundPage() {
  const [music, nature] = await Promise.all([
    listPublishedRestContentByKind("practice_video"),
    listPublishedRestContentByKind("nature_sound"),
  ]);

  return (
    <PublicIntroLayout
      eyebrow="SLEEP SOUND"
      title="入眠音"
      lead="心地よい入眠音楽と自然音で、穏やかな眠りへ導きます。"
    >
      <div className="space-y-16">
        <SleepContentSection
          title="入眠音楽"
          items={music}
          emptyMessage="コンテンツを準備中です。公開までしばらくお待ちください。"
        />
        <SleepContentSection
          title="自然音"
          items={nature}
          emptyMessage="コンテンツを準備中です。公開までしばらくお待ちください。"
        />
      </div>
    </PublicIntroLayout>
  );
}
