import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import SleepAudioSection from "@/components/sleep-content/SleepAudioSection";
import JapanNightBackdrop from "@/components/site/JapanNightBackdrop";
import SiteHeader from "@/components/site/SiteHeader";
import { GOLD } from "@/components/ui/tokens";
import { SLEEP_SOUND_NEKO } from "@/lib/sleep-check/content";
import { listPublishedRestContentByKind } from "@/lib/sleep-content/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "入眠音 | Sleep Wellness",
  description: "心地よい入眠音楽と自然音で、穏やかな眠りへ導きます。",
};

export default async function SleepSoundPage() {
  const [music, nature] = await Promise.all([
    listPublishedRestContentByKind("sleep_music"),
    listPublishedRestContentByKind("nature_sound"),
  ]);

  return (
    <main
      data-sleep-sound-night=""
      className="relative isolate min-h-screen text-[#F5F2EA]"
    >
      {/* トップと同じ富士山＋桜。fixed でスクロール中も全面に敷く */}
      <JapanNightBackdrop variant="firstView" />
      {/* 可読性用の暗いオーバーレイ（背景の構図は残す） */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, rgba(2,11,26,0.64) 0%, rgba(2,11,26,0.48) 40%, rgba(2,11,26,0.58) 100%)",
        }}
      />

      <div className="relative z-10">
        <SiteHeader
          surface="night"
          actions={
            <Link
              href="/contact"
              className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold text-[#071426] transition hover:opacity-90 sm:text-sm"
              style={{ background: GOLD }}
            >
              お問い合わせ
            </Link>
          }
        />

        <section className="border-b border-white/10">
          <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD, textShadow: "0 1px 10px rgba(0,0,0,0.45)" }}
            >
              SLEEP SOUND
            </p>
            <h1
              className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.045em] text-[#F5F2EA] sm:text-4xl lg:text-[2.75rem]"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}
            >
              入眠音
            </h1>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-16 px-6 py-12 pb-[var(--sw-sleep-page-bottom-pad)] sm:px-8 sm:py-16 lg:px-10 lg:pb-[5rem] lg:py-20">
          <SleepAudioSection
            title="入眠音楽"
            items={music}
            emptyMessage="コンテンツを準備中です。公開までしばらくお待ちください。"
            loop={false}
            nekoSrc={SLEEP_SOUND_NEKO.music}
          />
          <SleepAudioSection
            title="自然音"
            items={nature}
            emptyMessage="コンテンツを準備中です。公開までしばらくお待ちください。"
            loop
            nekoSrc={SLEEP_SOUND_NEKO.nature}
          />
          <p className="text-right text-xs text-white/50">Music: Pixabay</p>
        </div>

        <Footer />
      </div>
    </main>
  );
}
