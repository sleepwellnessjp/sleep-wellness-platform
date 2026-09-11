"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SLEEP_SOUND_COVERS } from "@/lib/sleep-check/content";
import type { SleepContent } from "@/lib/sleep-content/types";
import { GOLD, GOLD_LIGHT } from "@/components/ui/tokens";

type Props = {
  title: string;
  items: SleepContent[];
  emptyMessage: string;
  /** true: 自然音（常時ループ） / false: 入眠音楽（ループなし） */
  loop: boolean;
  nekoSrc: string;
};

/**
 * 半透明ダーク。背景の富士・桜が透け、音源ごとにごく薄い色味だけ変える。
 */
const GRADIENTS = [
  "linear-gradient(152deg, rgba(72,48,40,0.38) 0%, rgba(8,16,32,0.58) 48%, rgba(4,10,22,0.66) 100%)", // warm ash
  "linear-gradient(152deg, rgba(48,58,40,0.36) 0%, rgba(8,16,32,0.58) 48%, rgba(4,10,22,0.66) 100%)", // olive ash
  "linear-gradient(152deg, rgba(58,52,40,0.36) 0%, rgba(8,16,32,0.58) 48%, rgba(4,10,22,0.66) 100%)", // sand ash
  "linear-gradient(152deg, rgba(58,42,48,0.36) 0%, rgba(8,16,32,0.58) 48%, rgba(4,10,22,0.66) 100%)", // rose ash
  "linear-gradient(152deg, rgba(40,56,48,0.36) 0%, rgba(8,16,32,0.58) 48%, rgba(4,10,22,0.66) 100%)", // moss ash
  "linear-gradient(152deg, rgba(56,46,38,0.36) 0%, rgba(8,16,32,0.58) 48%, rgba(4,10,22,0.66) 100%)", // clay ash
  "linear-gradient(152deg, rgba(54,48,36,0.36) 0%, rgba(8,16,32,0.58) 48%, rgba(4,10,22,0.66) 100%)", // ochre ash
  "linear-gradient(152deg, rgba(44,48,56,0.36) 0%, rgba(8,16,32,0.58) 48%, rgba(4,10,22,0.66) 100%)", // cool ash
] as const;

function gradientForIndex(index: number): string {
  return GRADIENTS[index % GRADIENTS.length] ?? GRADIENTS[0];
}

function coverForItem(item: SleepContent): string | null {
  return (
    SLEEP_SOUND_COVERS[item.slug] ??
    SLEEP_SOUND_COVERS[item.title] ??
    null
  );
}

/** 「8分」形式。秒は四捨五入。 */
function formatMinutesLabel(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes}分`;
}

const NEKO_SIZE = 72;
/** サムネイル内カバーの占有率（周囲に余白） */
const COVER_SIZE_PERCENT = 68;

export default function SleepAudioSection({
  title,
  items,
  emptyMessage,
  loop,
  nekoSrc,
}: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  useEffect(() => {
    const audios = audioRefs.current;
    return () => {
      Object.values(audios).forEach((audio) => {
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);

  const stopAllExcept = (keepId: string | null) => {
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      if (!audio || id === keepId) return;
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const togglePlay = async (id: string) => {
    const audio = audioRefs.current[id];
    if (!audio) return;

    if (playingId === id && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);
      return;
    }

    stopAllExcept(id);
    try {
      audio.loop = loop;
      await audio.play();
      setPlayingId(id);
    } catch {
      setPlayingId(null);
    }
  };

  return (
    <section>
      <h2
        className="mb-2 flex items-center gap-3 text-2xl font-semibold tracking-[-0.02em] text-[#F5F2EA]"
        style={{ textShadow: "0 2px 16px rgba(0,0,0,0.55)" }}
      >
        <span
          className="inline-flex shrink-0"
          style={{
            width: NEKO_SIZE,
            height: NEKO_SIZE,
            filter:
              "drop-shadow(0 0 10px rgba(255,255,255,0.45)) drop-shadow(0 0 20px rgba(255,255,255,0.22))",
          }}
        >
          <Image
            src={nekoSrc}
            alt=""
            width={NEKO_SIZE}
            height={NEKO_SIZE}
            className="shrink-0 object-contain"
            style={{ width: NEKO_SIZE, height: NEKO_SIZE }}
          />
        </span>
        <span className="min-w-0">{title}</span>
      </h2>
      <p
        className="text-xs text-white/55"
        style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
      >
        再生は手動開始です。画面を消しても再生は続きます。
      </p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center">
          <p className="text-sm leading-6 text-white/50">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {items.map((item, index) => {
            const isPlaying = playingId === item.id;
            const durationLabel = formatMinutesLabel(item.durationSeconds);
            const gradientIndex = index + (loop ? 4 : 0);
            const coverSrc = coverForItem(item);
            return (
              <li key={item.id} className="min-w-0">
                {item.audioUrl ? (
                  <audio
                    ref={(el) => {
                      audioRefs.current[item.id] = el;
                    }}
                    preload="none"
                    loop={loop}
                    src={item.audioUrl}
                    onEnded={() => {
                      if (!loop) setPlayingId((prev) => (prev === item.id ? null : prev));
                    }}
                    className="hidden"
                  />
                ) : null}
                <button
                  type="button"
                  disabled={!item.audioUrl}
                  onClick={() => {
                    if (!item.audioUrl) return;
                    void togglePlay(item.id);
                  }}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-2xl text-left transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={
                    isPlaying
                      ? `${item.title}を停止`
                      : `${item.title}を再生`
                  }
                  aria-pressed={isPlaying}
                >
                  <div
                    className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 backdrop-blur-[2px]"
                    style={{
                      background: gradientForIndex(gradientIndex),
                      borderColor: GOLD_LIGHT,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-30"
                      style={{
                        background:
                          "radial-gradient(circle at 28% 22%, rgba(255,255,255,0.14), transparent 58%)",
                      }}
                    />
                    {coverSrc ? (
                      <span
                        className="pointer-events-none absolute left-1/2 top-1/2 overflow-hidden rounded-full -translate-x-1/2 -translate-y-1/2"
                        style={{
                          width: `${COVER_SIZE_PERCENT}%`,
                          height: `${COVER_SIZE_PERCENT}%`,
                          boxShadow: "0 6px 18px rgba(7, 20, 38, 0.22)",
                        }}
                      >
                        {/*
                          SVG は viewBox が本体ディスクにフィット済み。
                          円形クリップで四隅の濃紺フィールドを隠す。
                          next/image はリモート SVG を最適化できないため img を使用。
                        */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverSrc}
                          alt=""
                          className="h-full w-full object-cover object-center"
                        />
                      </span>
                    ) : null}
                    <span
                      className="absolute bottom-2.5 left-2.5 z-[1] inline-flex h-10 w-10 items-center justify-center rounded-full"
                      style={{
                        background: isPlaying
                          ? "rgba(245,242,234,0.92)"
                          : "rgba(255,255,255,0.28)",
                        color: isPlaying ? "#071426" : "#F5F2EA",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.28)",
                      }}
                      aria-hidden
                    >
                      {isPlaying ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                          <path d="M8 5.5v13l11-6.5L8 5.5z" />
                        </svg>
                      )}
                    </span>
                    {isPlaying ? (
                      <span
                        className="absolute right-2.5 top-2.5 z-[1] rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                        style={{
                          background: "rgba(7,20,38,0.55)",
                          color: GOLD,
                        }}
                      >
                        再生中
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2.5 px-0.5 pb-1">
                    <p
                      className="text-[14px] font-semibold leading-snug tracking-[-0.02em] text-[#F5F2EA] line-clamp-2"
                      style={{ textShadow: "0 1px 12px rgba(0,0,0,0.55)" }}
                    >
                      {item.title}
                    </p>
                    {durationLabel ? (
                      <p
                        className="mt-1 text-[12px] text-white/55"
                        style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
                      >
                        {durationLabel}
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
