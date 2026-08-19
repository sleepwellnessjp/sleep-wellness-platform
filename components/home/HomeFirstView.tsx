import Hero from "@/components/Hero";
import MySleepSection from "@/components/home/MySleepSection";
import SleepWordsBanner from "@/components/home/SleepWordsBanner";
import JapanNightBackdrop from "@/components/site/JapanNightBackdrop";

type HomeFirstViewProps = {
  analysisHref: string;
};

/**
 * トップの1画面分：月・富士山・湖面・桜の背景を通し、
 * ヒーロー → MY SLEEP → 睡眠のための言葉 を重ねる。
 */
export default function HomeFirstView({ analysisHref }: HomeFirstViewProps) {
  return (
    <div
      data-swij-first-view=""
      className="relative overflow-hidden bg-[#040c18] max-sm:flex max-sm:min-h-[100dvh] max-sm:flex-col sm:min-h-screen"
    >
      <JapanNightBackdrop variant="firstView" />

      <Hero />

      <MySleepSection analysisHref={analysisHref} />

      <div className="relative z-10 max-sm:shrink-0 px-5 pb-[calc(var(--sw-sleep-tabbar-clearance)+0.5rem)] pt-1 sm:px-8 sm:pb-10 sm:pt-2 lg:px-10">
        <SleepWordsBanner tone="onDark" />
      </div>
    </div>
  );
}
