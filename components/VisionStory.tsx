"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import VisionFadeUp from "@/components/VisionFadeUp";
import { HOME_TOP_HREF } from "@/lib/home-intro";

const NAVY = "#0F172A";

const ecosystem = [
  {
    label: "DATA",
    title: "睡眠分析",
    description: "ウェアラブルと生活習慣から、眠りの状態を可視化する。",
  },
  {
    label: "PRACTICE",
    title: "身体実践",
    description: "ヨガ・呼吸・瞑想で、心身を休息モードへ導く。",
  },
  {
    label: "LEARNING",
    title: "学びと育成",
    description: "アカデミーと講座で、睡眠ウェルネスを伝える人を育てる。",
  },
  {
    label: "COMMUNITY",
    title: "社会実装",
    description: "企業・地域・メディアと連携し、良い眠りを社会へ広げる。",
  },
];

const platformPillars = [
  { title: "Analyze", description: "睡眠データを理解する" },
  { title: "Practice", description: "身体から眠りを整える" },
  { title: "Learn", description: "学びを社会へ広げる" },
];

function SectionEyebrow({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div className="mb-8 flex items-center gap-4 sm:mb-10">
      <span
        className={`h-px w-10 sm:w-12 ${light ? "bg-amber-200/70" : "bg-[#b89242]"}`}
      />
      <p
        className={`text-xs font-semibold tracking-[0.30em] ${
          light ? "text-amber-200" : "text-[#8a6a2d]"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

export default function VisionStory() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative flex min-h-[100svh] overflow-hidden text-white"
        style={{ backgroundColor: NAVY }}
      >
        <div className="absolute inset-0">
          <Image
            src="/melatonin-yoga.jpg"
            alt="Sleep Wellness Institute Japan"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#0F172A]/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/95 via-[#0F172A]/70 to-[#0F172A]/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/40 via-transparent to-[#0F172A]/95" />
        </div>

        <div className="absolute left-6 top-6 z-20 sm:left-8 sm:top-8 lg:left-12 lg:top-10">
          <Link href={HOME_TOP_HREF} aria-label="Sleep Wellness Institute Japan トップへ">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={190}
              height={48}
              priority
              className="h-auto w-[150px] sm:w-[170px] lg:w-[190px]"
            />
          </Link>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pt-28 pb-32 sm:px-8 lg:px-10">
          <VisionFadeUp className="max-w-4xl">
            <p className="text-xs font-semibold tracking-[0.32em] text-amber-200/90">
              VISION
            </p>
            <h1 className="mt-8 text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.06em] text-white sm:text-6xl lg:text-8xl">
              睡眠を、
              <br />
              日本の新しい文化へ。
            </h1>
            <p className="mt-10 max-w-2xl text-base leading-8 text-white/75 sm:mt-12 sm:text-lg lg:text-xl lg:leading-9">
              Sleep Wellness Institute Japan が描く、
              <br className="hidden sm:block" />
              眠りを社会の基盤にする未来。
            </p>
          </VisionFadeUp>
        </div>
      </section>

      {/* Why */}
      <section className="bg-white py-32 sm:py-40 lg:py-48">
        <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
          <VisionFadeUp>
            <div className="mb-8 flex items-center justify-center gap-4 sm:mb-10">
              <span className="h-px w-10 bg-[#b89242] sm:w-12" />
              <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
                WHY
              </p>
              <span className="h-px w-10 bg-[#b89242] sm:w-12" />
            </div>
            <h2
              className="text-4xl font-semibold leading-[1.1] tracking-[-0.05em] sm:text-5xl lg:text-6xl"
              style={{ color: NAVY }}
            >
              なぜ、いま
              <br />
              睡眠なのか。
            </h2>
            <p className="mx-auto mt-10 max-w-2xl text-base leading-8 text-slate-600 sm:mt-12 sm:text-lg sm:leading-9">
              睡眠は、健康・創造性・働き方・人生の質を支える土台です。
              疲れを残したまま過ごす社会から、回復できる社会へ。
              その転換点に、私たちは立ちます。
            </p>
          </VisionFadeUp>
        </div>
      </section>

      {/* Sleep Wellness */}
      <section
        className="py-32 text-white sm:py-40 lg:py-48"
        style={{ backgroundColor: NAVY }}
      >
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <VisionFadeUp>
            <SectionEyebrow light>SLEEP WELLNESS</SectionEyebrow>
            <h2 className="text-4xl font-semibold leading-[1.1] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              睡眠を、
              <br />
              ウェルネスとして捉える。
            </h2>
            <p className="mt-10 max-w-2xl text-base leading-8 text-white/70 sm:mt-12 sm:text-lg sm:leading-9">
              単なる休息ではなく、心身の回復とパフォーマンスの基盤として。
              データと身体実践をつなぎ、一人ひとりの眠りをデザインします。
            </p>
          </VisionFadeUp>
        </div>
      </section>

      {/* Japan */}
      <section className="bg-white py-32 sm:py-40 lg:py-48">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
            <VisionFadeUp>
              <SectionEyebrow>JAPAN</SectionEyebrow>
              <h2
                className="text-4xl font-semibold leading-[1.1] tracking-[-0.05em] sm:text-5xl lg:text-6xl"
                style={{ color: NAVY }}
              >
                日本から、
                <br />
                眠りの文化を。
              </h2>
              <p className="mt-10 max-w-xl text-base leading-8 text-slate-600 sm:mt-12 sm:text-lg sm:leading-9">
                睡眠科学と、ヨガ・呼吸・瞑想、そして日本の暮らしの知恵を融合。
                世界に向けて、日本発の Sleep Wellness を届けます。
              </p>
            </VisionFadeUp>

            <VisionFadeUp delayMs={120}>
              <div className="relative overflow-hidden rounded-[36px]">
                <div className="relative aspect-[4/5] min-h-[360px]">
                  <Image
                    src="/yogafest.jpg"
                    alt="日本における Sleep Wellness の活動"
                    fill
                    className="object-cover"
                    sizes="(min-width:1024px) 45vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/70 via-transparent to-transparent" />
                </div>
              </div>
            </VisionFadeUp>
          </div>
        </div>
      </section>

      {/* Melatonin Yoga™ */}
      <section className="relative overflow-hidden py-32 text-white sm:py-40 lg:py-48">
        <div className="absolute inset-0">
          <Image
            src="/melatonin-yoga.jpg"
            alt="メラトニンヨガ™"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#0F172A]/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 via-[#0F172A]/55 to-[#0F172A]/90" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center lg:px-8">
          <VisionFadeUp>
            <p className="text-xs font-semibold tracking-[0.32em] text-amber-200">
              MELATONIN YOGA™
            </p>
            <h2 className="mt-8 text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-5xl lg:text-7xl">
              Melatonin Yoga™
            </h2>
            <p className="mx-auto mt-10 max-w-2xl text-base leading-8 text-white/75 sm:mt-12 sm:text-lg sm:leading-9">
              夜の休息へ導く、ヨガ・呼吸・瞑想・サウンドのプログラム。
              科学と身体知をつなぎ、眠りへのスイッチを整えます。
            </p>
          </VisionFadeUp>
        </div>
      </section>

      {/* Platform */}
      <section className="bg-white py-32 sm:py-40 lg:py-48">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <VisionFadeUp className="mx-auto max-w-3xl text-center">
            <div className="mb-8 flex items-center justify-center gap-4 sm:mb-10">
              <span className="h-px w-10 bg-[#b89242] sm:w-12" />
              <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
                PLATFORM
              </p>
              <span className="h-px w-10 bg-[#b89242] sm:w-12" />
            </div>
            <h2
              className="text-4xl font-semibold leading-[1.1] tracking-[-0.05em] sm:text-5xl lg:text-6xl"
              style={{ color: NAVY }}
            >
              Sleep Wellness
              <br />
              Platform
            </h2>
            <p className="mx-auto mt-10 max-w-2xl text-base leading-8 text-slate-600 sm:mt-12 sm:text-lg sm:leading-9">
              分析・実践・学びをひとつにつなぐ、日本初の Sleep Wellness Platform。
            </p>
          </VisionFadeUp>

          <div className="mx-auto mt-20 grid max-w-4xl gap-12 sm:mt-24 sm:grid-cols-3 sm:gap-10">
            {platformPillars.map((item, index) => (
              <VisionFadeUp key={item.title} delayMs={80 * (index + 1)}>
                <p className="text-xs font-semibold tracking-[0.24em] text-[#8a6a2d]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3
                  className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
                  style={{ color: NAVY }}
                >
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                  {item.description}
                </p>
              </VisionFadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Academy */}
      <section
        className="py-32 text-white sm:py-40 lg:py-48"
        style={{ backgroundColor: NAVY }}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
            <VisionFadeUp>
              <SectionEyebrow light>ACADEMY</SectionEyebrow>
              <h2 className="text-4xl font-semibold leading-[1.1] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                眠りを伝える
                <br />
                人を育てる。
              </h2>
              <p className="mt-10 max-w-xl text-base leading-8 text-white/70 sm:mt-12 sm:text-lg sm:leading-9">
                Navigator から Instructor、Producer へ。
                睡眠ウェルネスを学び、実践し、社会へ届ける人材を育成します。
              </p>
              <Link
                href="/academy"
                className="mt-12 inline-flex items-center gap-3 border-b border-white/30 pb-2 text-sm font-semibold tracking-[0.06em] text-white transition hover:border-amber-200 hover:text-amber-200"
              >
                Academy を見る
                <span aria-hidden="true">→</span>
              </Link>
            </VisionFadeUp>

            <VisionFadeUp delayMs={120}>
              <div className="relative overflow-hidden rounded-[36px]">
                <div className="relative aspect-[5/4] min-h-[280px]">
                  <Image
                    src="/retreat.jpg"
                    alt="Sleep Wellness Academy"
                    fill
                    className="object-cover"
                    sizes="(min-width:1024px) 45vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-[#0F172A]/25" />
                </div>
              </div>
            </VisionFadeUp>
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="bg-white py-32 sm:py-40 lg:py-48">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <VisionFadeUp className="mx-auto max-w-3xl text-center">
            <div className="mb-8 flex items-center justify-center gap-4 sm:mb-10">
              <span className="h-px w-10 bg-[#b89242] sm:w-12" />
              <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
                ECOSYSTEM
              </p>
              <span className="h-px w-10 bg-[#b89242] sm:w-12" />
            </div>
            <h2
              className="text-4xl font-semibold leading-[1.1] tracking-[-0.05em] sm:text-5xl lg:text-6xl"
              style={{ color: NAVY }}
            >
              Sleep Wellness
              <br />
              Ecosystem
            </h2>
            <p className="mx-auto mt-10 max-w-2xl text-base leading-8 text-slate-600 sm:mt-12 sm:text-lg sm:leading-9">
              データ・実践・学び・社会実装がつながり、
              一人ひとりの眠りから社会全体のウェルネスへ。
            </p>
          </VisionFadeUp>

          <div className="mx-auto mt-20 grid max-w-5xl gap-10 sm:mt-24 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {ecosystem.map((item, index) => (
              <VisionFadeUp key={item.label} delayMs={70 * (index + 1)}>
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d]">
                  {item.label}
                </p>
                <h3
                  className="mt-4 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
                  style={{ color: NAVY }}
                >
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </VisionFadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section
        className="py-32 text-white sm:py-40 lg:py-48"
        style={{ backgroundColor: NAVY }}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-[42%_58%] lg:gap-20">
            <VisionFadeUp>
              <div className="relative overflow-hidden rounded-[36px]">
                <div className="relative aspect-[4/5] min-h-[400px]">
                  <Image
                    src="/taka-photo-v2.jpg"
                    alt="若林貴久"
                    fill
                    className="object-cover object-[center_85%]"
                    sizes="(min-width:1024px) 42vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/75 via-transparent to-transparent" />
                </div>
              </div>
            </VisionFadeUp>

            <VisionFadeUp delayMs={100}>
              <SectionEyebrow light>FOUNDER</SectionEyebrow>
              <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Sleep Wellness
                <br />
                Producer
              </h2>
              <p className="mt-8 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                TAKA
              </p>
              <p className="mt-2 text-lg tracking-[0.08em] text-white/65 sm:text-xl">
                若林貴久
              </p>
              <p className="mt-10 max-w-xl text-base leading-8 text-white/70 sm:text-lg sm:leading-9">
                睡眠科学・ヨガ・呼吸・瞑想・日本文化を融合し、
                Sleep Wellness Institute Japan を設立。
                メラトニンヨガ™を考案し、眠りを日本の新しい文化へ育てています。
              </p>
            </VisionFadeUp>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="relative overflow-hidden py-32 text-white sm:py-40 lg:py-52">
        <div className="absolute inset-0">
          <Image
            src="/melatonin-yoga.jpg"
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#0F172A]/65" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/85 via-[#0F172A]/50 to-[#0F172A]/92" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center lg:px-8">
          <VisionFadeUp>
            <p className="text-xs font-semibold tracking-[0.32em] text-white/60">
              OUR VISION
            </p>
            <h2 className="mt-10 text-5xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-6xl md:text-7xl lg:text-8xl">
              Sleep is
              <br />
              the Foundation
              <br />
              of Life.
            </h2>
            <p className="mt-10 text-2xl font-medium leading-tight tracking-[-0.04em] sm:mt-12 sm:text-3xl lg:text-4xl">
              睡眠を、人生の土台へ。
            </p>
            <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-white/70 sm:mt-10 sm:text-lg sm:leading-9">
              一人ひとりの眠りから、社会全体のウェルネスへ。
              それが、Sleep Wellness Institute Japan のビジョンです。
            </p>
          </VisionFadeUp>
        </div>
      </section>
    </>
  );
}
