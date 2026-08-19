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
 * iOS Safari では 100dvh 固定を避け、コンテンツ高さに背景を追従させる。
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

      <div className="relative z-10 px-5 pt-1 sm:px-8 sm:pb-12 sm:pt-3 lg:px-10" style={{ paddingBottom: "calc(6.25rem + env(safe-area-inset-bottom, 0px) + 1.5rem)" }}>
        <SleepWordsBanner tone="onDark" />
      </div>
    </div>
  );
}
