import type { Metadata } from "next";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import SleepContentSection from "@/components/sleep-content/SleepContentSection";
import { listPublishedRestContentByKind } from "@/lib/sleep-content/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "語りかけ | Sleep Wellness",
  description: "やさしい語りかけで、心と身体をリラックスさせ眠りへ導きます。",
};

export default async function SleepTalkPage() {
  const items = await listPublishedRestContentByKind("talk_video");

  return (
    <PublicIntroLayout
      eyebrow="SLEEP TALK"
      title="語りかけ"
      lead="やさしい語りかけで、心と身体をリラックスさせ眠りへ導きます。"
      contentClassName="pb-[var(--sw-sleep-page-bottom-pad)] sm:pb-[5rem]"
    >
      <SleepContentSection
        title="語りかけ"
        items={items}
        emptyMessage="コンテンツを準備中です。公開までしばらくお待ちください。"
      />
    </PublicIntroLayout>
  );
}
