import Hero from "@/components/Hero";
import MySleepSection from "@/components/home/MySleepSection";
import SleepWordsBanner from "@/components/home/SleepWordsBanner";
import JapanNightBackdrop from "@/components/site/JapanNightBackdrop";

type HomeFirstViewProps = {
  analysisHref: string;
};

/**
 * トップのファーストビュー：月・富士山・湖面・桜の背景を
 * ヒーロー → MY SLEEP → 睡眠のための言葉 まで通す。
 * iOS Safari では 100dvh / 100svh / 100lvh を使わず、コンテンツ高さに背景を追従させる。
 * バナーは通常フロー（円の下 → タブバー余白）で重ねない。
 */
export default function HomeFirstView({ analysisHref }: HomeFirstViewProps) {
  return (
    <div
      data-swij-first-view=""
      className="relative bg-[#040c18]"
    >
      <JapanNightBackdrop variant="firstView" />

      <Hero />

      <MySleepSection analysisHref={analysisHref} />

      <div
        data-swij-sleep-words=""
        className="relative z-10 px-5 pt-2 pb-[calc(var(--sw-sleep-tabbar-clearance)+2.75rem)] sm:px-8 sm:pt-3 md:pt-2 md:pb-[calc(6.25rem+env(safe-area-inset-bottom,0px)+1.25rem)] lg:px-10 lg:pb-12 lg:pt-3"
      >
        <SleepWordsBanner tone="onDark" />
      </div>
    </div>
  );
}
