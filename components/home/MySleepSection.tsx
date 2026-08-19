"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FOCUS_RING } from "@/components/ui/tokens";
import { useHomeIntroReady } from "@/lib/home-intro-ready";
import { SLEEP_CHECK_IMAGES } from "@/lib/sleep-check/content";

const GOLD = "#B8945F";
const CREAM = "#F5F0E4";
const ORBIT_GOLD = "rgba(184, 148, 95, 0.6)";
const PLANET_SHADOW = "0 14px 20px rgba(0, 0, 0, 0.3)";
const REVEAL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const REVEAL_MS = 900;

const ORBIT_R = 43;

function orbitPosition(clockHour: number, minute = 0): { left: string; top: string } {
  const angle = ((clockHour % 12) + minute / 60) * 30 * (Math.PI / 180);
  const x = 50 + ORBIT_R * Math.sin(angle);
  const y = 50 - ORBIT_R * Math.cos(angle);
  return { left: `${x}%`, top: `${y}%` };
}

function revealStyle(
  visible: boolean,
  delayMs: number,
  reducedMotion: boolean,
): React.CSSProperties {
  if (reducedMotion) {
    return { opacity: 1, transform: "none", filter: "none" };
  }
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.92)",
    filter: visible ? "blur(0)" : "blur(6px)",
    transition: `opacity ${REVEAL_MS}ms ${REVEAL_EASE}, transform ${REVEAL_MS}ms ${REVEAL_EASE}, filter ${REVEAL_MS}ms ${REVEAL_EASE}`,
    transitionDelay: visible ? `${delayMs}ms` : "0ms",
    willChange: visible ? "auto" : "opacity, transform, filter",
  };
}

function InstructorChartIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="h-[58%] w-[58%]"
      aria-hidden
    >
      <rect
        x="6"
        y="8"
        width="36"
        height="32"
        rx="4"
        fill="none"
        stroke={CREAM}
        strokeWidth="1.5"
      />
      <rect x="12" y="28" width="6" height="10" rx="1" fill={GOLD} />
      <rect x="21" y="22" width="6" height="16" rx="1" fill={GOLD} />
      <rect x="30" y="16" width="6" height="22" rx="1" fill={GOLD} />
    </svg>
  );
}

function SleepStepsIcon() {
  return (
    <div className="flex flex-col items-center justify-center leading-none">
      <svg viewBox="0 0 80 36" className="mb-1 h-7 w-[88%]" aria-hidden>
        <path
          d="M 10 30 A 30 30 0 0 1 70 30"
          fill="none"
          stroke={GOLD}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[1.1rem] font-semibold tabular-nums sm:text-[1.25rem]" style={{ color: CREAM }}>
          6.8
        </span>
        <span className="text-[9px] sm:text-[10px]" style={{ color: "rgba(245,240,228,0.72)" }}>
          時間
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-0.5">
        <span className="text-[0.9rem] font-semibold tabular-nums sm:text-[1rem]" style={{ color: GOLD }}>
          8,000
        </span>
        <span className="text-[9px] sm:text-[10px]" style={{ color: "rgba(184,148,95,0.85)" }}>
          歩
        </span>
      </div>
    </div>
  );
}

function PlanetLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-1 text-center text-[10px] font-semibold tracking-[0.04em] sm:mt-1.5 sm:text-[11px]"
      style={{ color: CREAM }}
    >
      {children}
    </p>
  );
}

type MySleepSectionProps = {
  analysisHref: string;
};

export default function MySleepSection({ analysisHref }: MySleepSectionProps) {
  const introReady = useHomeIntroReady();
  const [visible, setVisible] = useState(false);
  const playedRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (!introReady || playedRef.current) return;
    playedRef.current = true;
    if (reducedMotion) {
      setVisible(true);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [introReady, reducedMotion]);

  const leftPos = orbitPosition(8, 15);
  const rightPos = orbitPosition(1, 45);

  return (
    <section
      aria-labelledby="my-sleep-heading"
      className="relative px-5 pb-4 pt-4 sm:px-8 sm:pb-8 sm:pt-10 lg:px-10 max-sm:flex max-sm:flex-1 max-sm:flex-col max-sm:justify-center"
    >
      <div className="mx-auto max-w-lg text-center">
        <p
          id="my-sleep-heading"
          className="text-[10px] font-semibold tracking-[0.42em] sm:text-[11px]"
          style={{ color: GOLD }}
        >
          M Y&nbsp;&nbsp;S L E E P
        </p>
        <p
          className="mt-1 text-[12px] tracking-[0.06em] sm:mt-1.5 sm:text-[13px]"
          style={{ color: "rgba(245, 240, 228, 0.55)" }}
        >
          眠りを、まんなかに。
        </p>
      </div>

      <div className="relative mx-auto mt-3 aspect-square w-[min(64vw,15.5rem)] max-sm:mt-2 sm:mt-6 sm:w-[min(68vw,17rem)] sm:max-w-[20rem] lg:max-w-[22rem]">
        {/* 軌道円（二重線） */}
        <div
          className="pointer-events-none absolute inset-0"
          style={revealStyle(visible, 0, reducedMotion)}
          aria-hidden
        >
          <svg
            viewBox="0 0 200 200"
            className="h-full w-full"
            fill="none"
          >
            <circle
              cx="100"
              cy="100"
              r="96"
              stroke={ORBIT_GOLD}
              strokeWidth="1"
            />
            <circle
              cx="100"
              cy="100"
              r="85"
              stroke={ORBIT_GOLD}
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* 中央：睡眠テスト */}
        <div
          className="absolute left-1/2 top-1/2 z-10 w-[40%] -translate-x-1/2 -translate-y-1/2"
          style={revealStyle(visible, 150, reducedMotion)}
        >
          <Link
            href="/sleep/check"
            className={`group block ${FOCUS_RING}`}
            aria-label="睡眠テスト"
          >
            <div
              className="relative flex aspect-square items-center justify-center overflow-hidden rounded-full transition active:scale-[0.98]"
              style={{
                background: "rgba(245, 240, 228, 0.68)",
                border: `3px solid ${GOLD}`,
                boxShadow: `${PLANET_SHADOW}, inset 0 0 0 1px ${GOLD}`,
              }}
            >
              <Image
                src={SLEEP_CHECK_IMAGES.tsujo}
                alt=""
                width={140}
                height={140}
                className="relative z-[1] h-[72%] w-[72%] object-contain transition duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <PlanetLabel>睡眠テスト</PlanetLabel>
          </Link>
        </div>

        {/* 左：講師専用分析（8時15分方向） */}
        <div
          className="absolute z-10 w-[28%] -translate-x-1/2 -translate-y-1/2"
          style={{
            left: leftPos.left,
            top: leftPos.top,
            ...revealStyle(visible, 300, reducedMotion),
          }}
        >
          <Link
            href={analysisHref}
            className={`group block ${FOCUS_RING}`}
            aria-label="講師専用分析"
          >
            <div
              className="relative flex aspect-square items-center justify-center rounded-full transition active:scale-[0.98]"
              style={{
                background: "rgba(84, 68, 44, 0.6)",
                boxShadow: PLANET_SHADOW,
              }}
            >
              <InstructorChartIcon />
            </div>
            <PlanetLabel>講師専用分析</PlanetLabel>
          </Link>
        </div>

        {/* 右：睡眠と歩数（1時45分方向） */}
        <div
          className="absolute z-10 w-[28%] -translate-x-1/2 -translate-y-1/2 cursor-default"
          style={{
            left: rightPos.left,
            top: rightPos.top,
            ...revealStyle(visible, 450, reducedMotion),
          }}
          aria-label="睡眠と歩数（準備中）"
        >
          <div
            className="relative flex aspect-square items-center justify-center rounded-full"
            style={{
              background: "rgba(47, 70, 102, 0.5)",
              boxShadow: PLANET_SHADOW,
            }}
          >
            <SleepStepsIcon />
          </div>
          <PlanetLabel>睡眠と歩数</PlanetLabel>
        </div>
      </div>
    </section>
  );
}
