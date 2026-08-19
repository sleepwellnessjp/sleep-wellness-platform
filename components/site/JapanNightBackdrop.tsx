import { getImageProps } from "next/image";
import type { CSSProperties } from "react";

/** 前景・中景・遠景で速度差をつける花びら（吹雪にならない程度） */
const PETALS = [
  // near — 大きく・速め・揺れ強め
  { left: "60%", top: "-5%", size: 12, delay: "0s", dur: "14s", drift: 56, sway: 22, rot: 160, layer: "near" },
  { left: "74%", top: "-9%", size: 11, delay: "2.2s", dur: "15s", drift: -48, sway: 26, rot: -180, layer: "near" },
  { left: "82%", top: "1%", size: 10, delay: "4.8s", dur: "13.5s", drift: 42, sway: 20, rot: 210, layer: "near" },
  { left: "66%", top: "-3%", size: 13, delay: "7s", dur: "16s", drift: -38, sway: 24, rot: -140, layer: "near" },
  // mid
  { left: "70%", top: "-7%", size: 9, delay: "1s", dur: "18s", drift: 36, sway: 16, rot: 130, layer: "mid" },
  { left: "78%", top: "-2%", size: 8, delay: "3.5s", dur: "19s", drift: -44, sway: 18, rot: -200, layer: "mid" },
  { left: "58%", top: "0%", size: 9, delay: "6s", dur: "17s", drift: 30, sway: 14, rot: 170, layer: "mid" },
  { left: "86%", top: "-6%", size: 8, delay: "9s", dur: "20s", drift: -28, sway: 15, rot: -110, layer: "mid" },
  { left: "64%", top: "3%", size: 7, delay: "11s", dur: "18.5s", drift: 40, sway: 17, rot: 190, layer: "mid" },
  // far — 小さく・遅め
  { left: "72%", top: "-4%", size: 6, delay: "0.8s", dur: "24s", drift: 22, sway: 10, rot: 100, layer: "far" },
  { left: "80%", top: "-8%", size: 5, delay: "5s", dur: "26s", drift: -18, sway: 9, rot: -90, layer: "far" },
  { left: "68%", top: "2%", size: 6, delay: "8.5s", dur: "25s", drift: 16, sway: 8, rot: 140, layer: "far" },
  { left: "88%", top: "-1%", size: 5, delay: "12s", dur: "27s", drift: -24, sway: 11, rot: -160, layer: "far" },
] as const;

/**
 * 本サイト（イントロ後）用「日本の静かな夜」背景。
 * 完成構図の画像は固定し、光・花びらだけを別レイヤーで動かす（水面は静止）。
 */
export default function JapanNightBackdrop({
  variant = "hero",
}: {
  /** firstView: 1画面全体（MY SLEEP まで）向けの構図 */
  variant?: "hero" | "firstView";
}) {
  const {
    props: { srcSet: mobileBgSrcSet },
  } = getImageProps({
    src: "/japan-night-hero-mobile-v5.webp",
    alt: "",
    width: 828,
    height: 1792,
    sizes: "100vw",
    quality: 75,
  });
  const { props: desktopBgProps } = getImageProps({
    src: "/japan-night-hero-pc.webp",
    alt: "",
    width: 1920,
    height: 1080,
    sizes: "100vw",
    quality: 75,
  });

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#040c18]"
      aria-hidden="true"
      data-swij-japan-night=""
      data-variant={variant}
    >
      <style>{`
        [data-swij-japan-night] {
          --jn-fall-end: 112vh;
        }
        [data-swij-japan-night][data-variant="firstView"] {
          --jn-fall-end: 165vh;
        }
        [data-swij-japan-night] .jn-moon-breathe {
          animation: jn-moon-breathe 8s ease-in-out infinite;
        }
        [data-swij-japan-night] .jn-moon-breathe-outer {
          animation: jn-moon-breathe-outer 10s ease-in-out infinite;
          animation-delay: -2s;
        }
        [data-swij-japan-night] .jn-andon-flicker {
          animation: jn-andon-flicker 3.6s ease-in-out infinite;
        }
        [data-swij-japan-night] .jn-andon-flicker-soft {
          animation: jn-andon-flicker 4.8s ease-in-out infinite;
          animation-delay: -1.4s;
        }
        [data-swij-japan-night] .jn-andon-spill {
          animation: jn-andon-spill 4.2s ease-in-out infinite;
          animation-delay: -0.6s;
        }
        [data-swij-japan-night] .jn-petal-near {
          animation-name: jn-petal-fall-near;
          animation-timing-function: cubic-bezier(0.33, 0.1, 0.4, 1);
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        [data-swij-japan-night] .jn-petal-mid {
          animation-name: jn-petal-fall-mid;
          animation-timing-function: cubic-bezier(0.33, 0.12, 0.4, 1);
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        [data-swij-japan-night] .jn-petal-far {
          animation-name: jn-petal-fall-far;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        [data-swij-japan-night] .jn-parallax-near {
          animation: jn-parallax-near 22s ease-in-out infinite;
        }
        [data-swij-japan-night] .jn-parallax-mid {
          animation: jn-parallax-mid 30s ease-in-out infinite;
        }
        [data-swij-japan-night] .jn-parallax-far {
          animation: jn-parallax-far 40s ease-in-out infinite;
        }

        @keyframes jn-moon-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes jn-moon-breathe-outer {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.18); }
        }
        @keyframes jn-andon-flicker {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          20% { opacity: 0.95; transform: scale(1.12); }
          45% { opacity: 0.68; transform: scale(1.04); }
          70% { opacity: 0.9; transform: scale(1.1); }
        }
        @keyframes jn-andon-spill {
          0%, 100% { opacity: 0.4; transform: scale(1) translate3d(0, 0, 0); }
          35% { opacity: 0.8; transform: scale(1.16) translate3d(-8px, 3px, 0); }
          65% { opacity: 0.5; transform: scale(1.06) translate3d(4px, 1px, 0); }
        }
        @keyframes jn-petal-fall-near {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
            opacity: 0;
          }
          6% { opacity: 0.85; }
          25% {
            transform: translate3d(calc(var(--jn-drift) * 0.25), 28vh, 0) rotate(calc(var(--jn-rot) * 0.3));
          }
          50% {
            transform: translate3d(calc(var(--jn-drift) * 0.55 + var(--jn-sway)), 55vh, 0) rotate(calc(var(--jn-rot) * 0.6));
            opacity: 0.75;
          }
          75% {
            transform: translate3d(calc(var(--jn-drift) * 0.8 - var(--jn-sway)), 82vh, 0) rotate(calc(var(--jn-rot) * 0.85));
            opacity: 0.55;
          }
          100% {
            transform: translate3d(var(--jn-drift), var(--jn-fall-end), 0) rotate(var(--jn-rot));
            opacity: 0;
          }
        }
        @keyframes jn-petal-fall-mid {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(0.92);
            opacity: 0;
          }
          8% { opacity: 0.65; }
          40% {
            transform: translate3d(calc(var(--jn-drift) * 0.4 + var(--jn-sway)), 42vh, 0) rotate(calc(var(--jn-rot) * 0.45)) scale(0.92);
          }
          70% {
            transform: translate3d(calc(var(--jn-drift) * 0.75 - var(--jn-sway)), 75vh, 0) rotate(calc(var(--jn-rot) * 0.75)) scale(0.9);
            opacity: 0.45;
          }
          100% {
            transform: translate3d(var(--jn-drift), var(--jn-fall-end), 0) rotate(var(--jn-rot)) scale(0.88);
            opacity: 0;
          }
        }
        @keyframes jn-petal-fall-far {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(0.75);
            opacity: 0;
          }
          10% { opacity: 0.4; }
          100% {
            transform: translate3d(var(--jn-drift), var(--jn-fall-end), 0) rotate(var(--jn-rot)) scale(0.7);
            opacity: 0;
          }
        }
        @keyframes jn-parallax-near {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(3px, 8px, 0); }
        }
        @keyframes jn-parallax-mid {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-2px, 4px, 0); }
        }
        @keyframes jn-parallax-far {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(1px, 2px, 0); }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-swij-japan-night] .jn-moon-breathe,
          [data-swij-japan-night] .jn-moon-breathe-outer,
          [data-swij-japan-night] .jn-andon-flicker,
          [data-swij-japan-night] .jn-andon-flicker-soft,
          [data-swij-japan-night] .jn-andon-spill,
          [data-swij-japan-night] .jn-petal-near,
          [data-swij-japan-night] .jn-petal-mid,
          [data-swij-japan-night] .jn-petal-far,
          [data-swij-japan-night] .jn-parallax-near,
          [data-swij-japan-night] .jn-parallax-mid,
          [data-swij-japan-night] .jn-parallax-far {
            animation: none !important;
          }
        }
      `}</style>

      {/* 遠景：完成構図の背景画像（固定・動かさない） */}
      <div className="absolute inset-0">
        <picture>
          <source media="(max-width: 639px)" srcSet={mobileBgSrcSet} />
          <img
            {...desktopBgProps}
            alt=""
            fetchPriority="high"
            className={`absolute inset-0 h-full w-full object-cover ${
              variant === "firstView"
                ? "object-[22%_27%] sm:object-[48%_39%] lg:object-[52%_37%]"
                : "object-[20%_34%] sm:object-[48%_46%] lg:object-[52%_44%]"
            }`}
          />
        </picture>
      </div>

      {/* 桜を落ち着かせる（構図維持） */}
      <div
        className="absolute right-0 top-0 h-[42%] w-[48%] max-sm:h-[30%] max-sm:w-[48%]"
        style={{
          background:
            "radial-gradient(ellipse at 82% 10%, rgba(8,16,28,0.4) 0%, rgba(8,16,28,0.16) 45%, transparent 72%)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        className="absolute right-0 top-0 hidden h-[38%] w-[42%] sm:block"
        style={{
          background:
            "linear-gradient(225deg, rgba(20,32,48,0.35) 0%, transparent 55%)",
        }}
      />

      {/* 月そのものは固定。周囲の光だけ呼吸（認識しやすい強さ） */}
      <div
        className="jn-moon-breathe-outer absolute rounded-full blur-3xl max-sm:left-[-4%] max-sm:top-[-2%] max-sm:h-[40vw] max-sm:w-[40vw] sm:left-[4%] sm:top-[0%] sm:h-[min(30vw,280px)] sm:w-[min(30vw,280px)] lg:left-[6%]"
        style={{
          background:
            "radial-gradient(circle, rgba(232,220,190,0.22) 0%, rgba(180,170,150,0.08) 45%, transparent 72%)",
        }}
      />
      <div
        className="jn-moon-breathe absolute rounded-full blur-3xl max-sm:left-[2%] max-sm:top-[2%] max-sm:h-[32vw] max-sm:w-[32vw] sm:left-[8%] sm:top-[4%] sm:h-[min(22vw,200px)] sm:w-[min(22vw,200px)] lg:left-[10%]"
        style={{
          background:
            "radial-gradient(circle, rgba(232,220,190,0.28) 0%, rgba(180,170,150,0.1) 48%, transparent 72%)",
        }}
      />

      {/* 既存の水面反射抑制（構図維持・静止。水面アニメーションはしない） */}
      <div
        className="absolute bottom-[8%] left-[8%] h-[36%] w-[42%] max-sm:bottom-[14%] max-sm:left-[6%] max-sm:h-[26%] max-sm:w-[55%]"
        style={{
          background:
            "radial-gradient(ellipse at 35% 40%, rgba(6,14,26,0.28) 0%, transparent 60%)",
        }}
      />

      {/* 行灯の光＋床への伝わり（点滅ではなくゆらめき） */}
      <div
        className="absolute inset-y-0 right-0 hidden w-[28%] sm:block"
        style={{
          background:
            "linear-gradient(270deg, rgba(4,10,18,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="jn-andon-flicker absolute bottom-[6%] right-[4%] hidden h-48 w-56 rounded-full blur-2xl sm:block lg:right-[5%]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,160,70,0.58) 0%, rgba(255,130,50,0.22) 45%, transparent 70%)",
        }}
      />
      <div
        className="jn-andon-flicker-soft absolute bottom-[8%] right-[8%] hidden h-28 w-32 rounded-full blur-xl sm:block"
        style={{
          background:
            "radial-gradient(circle, rgba(255,215,140,0.7) 0%, transparent 70%)",
        }}
      />
      <div
        className="jn-andon-spill absolute bottom-[3%] right-[1%] hidden h-36 w-64 rounded-full blur-3xl sm:block"
        style={{
          background:
            "radial-gradient(ellipse at 70% 40%, rgba(255,145,55,0.35) 0%, rgba(255,120,40,0.12) 50%, transparent 75%)",
        }}
      />
      <div
        className="jn-andon-flicker absolute bottom-[8%] right-[2%] h-36 w-40 rounded-full blur-2xl sm:hidden"
        style={{
          background:
            "radial-gradient(circle, rgba(255,155,65,0.48) 0%, transparent 70%)",
        }}
      />
      <div
        className="jn-andon-spill absolute bottom-[3%] right-0 h-28 w-44 rounded-full blur-2xl sm:hidden"
        style={{
          background:
            "radial-gradient(ellipse at 80% 50%, rgba(255,145,55,0.28) 0%, transparent 70%)",
        }}
      />

      {/* 端のビネット：PCは従来 / スマホは左上の月を残す */}
      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          background:
            "radial-gradient(ellipse 95% 85% at 50% 45%, transparent 38%, rgba(2,8,16,0.32) 100%)",
        }}
      />
      <div
        className="absolute inset-0 sm:hidden"
        style={{
          background:
            "radial-gradient(ellipse 115% 95% at 58% 50%, transparent 46%, rgba(2,8,16,0.26) 100%)",
        }}
      />

      {/* PC：中央コピー可読性（変更しない） */}
      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          background:
            "radial-gradient(ellipse 44% 48% at 48% 40%, rgba(3,10,20,0.72) 0%, rgba(3,10,20,0.4) 40%, rgba(3,10,20,0.12) 64%, transparent 80%)",
        }}
      />

      {/* スマホ：タイトル可読性は最小限の濃紺ベール＋山の輪郭を持ち上げ */}
      <div
        className="absolute inset-0 sm:hidden"
        style={{
          background:
            "radial-gradient(ellipse 68% 22% at 50% 36%, rgba(3,10,20,0.32) 0%, rgba(3,10,20,0.08) 58%, transparent 85%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-[14%] h-[52%] sm:hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, rgba(200,220,240,0.28) 0%, rgba(160,190,220,0.12) 40%, transparent 68%)",
          mixBlendMode: "soft-light",
        }}
      />
      <div
        className="absolute inset-x-[6%] top-[22%] h-[36%] sm:hidden"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(220,235,250,0.14) 35%, transparent 100%)",
          mixBlendMode: "screen",
        }}
      />

      {/* 上下グラデ：PCは従来 / スマホは上部を薄く */}
      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          background:
            "linear-gradient(180deg, rgba(3,10,20,0.22) 0%, transparent 14%, transparent 76%, rgba(2,8,16,0.5) 100%)",
        }}
      />
      <div
        className="absolute inset-0 sm:hidden"
        style={{
          background:
            variant === "firstView"
              ? "linear-gradient(180deg, rgba(3,10,20,0.02) 0%, transparent 16%, transparent 84%, rgba(2,8,16,0.52) 100%)"
              : "linear-gradient(180deg, rgba(3,10,20,0.02) 0%, transparent 20%, transparent 70%, rgba(2,8,16,0.45) 100%)",
        }}
      />

      {/* 遠景の花びら */}
      <div className="jn-parallax-far absolute inset-0 overflow-hidden">
        {PETALS.filter((p) => p.layer === "far").map((p, i) => (
          <span
            key={`far-${i}`}
            className="jn-petal-far absolute block rounded-[60%_40%_60%_40%]"
            style={
              {
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size * 0.72,
                background:
                  "radial-gradient(ellipse at 30% 30%, rgba(255,230,235,0.55), rgba(200,155,165,0.28) 55%, rgba(140,100,110,0.12))",
                animationDuration: p.dur,
                animationDelay: p.delay,
                ["--jn-drift" as string]: `${p.drift}px`,
                ["--jn-sway" as string]: `${p.sway}px`,
                ["--jn-rot" as string]: `${p.rot}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* 中景の花びら */}
      <div className="jn-parallax-mid absolute inset-0 overflow-hidden">
        {PETALS.filter((p) => p.layer === "mid").map((p, i) => (
          <span
            key={`mid-${i}`}
            className="jn-petal-mid absolute block rounded-[60%_40%_60%_40%]"
            style={
              {
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size * 0.72,
                background:
                  "radial-gradient(ellipse at 30% 30%, rgba(255,232,238,0.75), rgba(220,170,180,0.4) 55%, rgba(160,120,130,0.15))",
                boxShadow: "0 0 5px rgba(255,220,230,0.2)",
                animationDuration: p.dur,
                animationDelay: p.delay,
                ["--jn-drift" as string]: `${p.drift}px`,
                ["--jn-sway" as string]: `${p.sway}px`,
                ["--jn-rot" as string]: `${p.rot}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* 前景の花びら */}
      <div className="jn-parallax-near absolute inset-0 overflow-hidden">
        {PETALS.filter((p) => p.layer === "near").map((p, i) => (
          <span
            key={`near-${i}`}
            className="jn-petal-near absolute block rounded-[60%_40%_60%_40%]"
            style={
              {
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size * 0.72,
                background:
                  "radial-gradient(ellipse at 30% 30%, rgba(255,236,240,0.9), rgba(230,175,185,0.5) 55%, rgba(170,125,135,0.2))",
                boxShadow: "0 0 6px rgba(255,220,230,0.28)",
                animationDuration: p.dur,
                animationDelay: p.delay,
                ["--jn-drift" as string]: `${p.drift}px`,
                ["--jn-sway" as string]: `${p.sway}px`,
                ["--jn-rot" as string]: `${p.rot}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* 最下部：極薄の青海波（固定） */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 opacity-[0.08] sm:h-28 sm:opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='76' height='38' viewBox='0 0 76 38'%3E%3Cpath fill='none' stroke='%23c9a45a' stroke-width='0.9' d='M0 38c12.5 0 12.5-13 25-13s12.5 13 25 13 12.5-13 25-13'/%3E%3Cpath fill='none' stroke='%23c9a45a' stroke-width='0.9' d='M0 22c12.5 0 12.5-13 25-13s12.5 13 25 13 12.5-13 25-13'/%3E%3Cpath fill='none' stroke='%23c9a45a' stroke-width='0.9' d='M0 6c12.5 0 12.5-13 25-13s12.5 13 25 13 12.5-13 25-13'/%3E%3C/svg%3E\")",
          backgroundSize: "76px 38px",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "center bottom",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 55%, black 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 55%, black 100%)",
        }}
      />
    </div>
  );
}
