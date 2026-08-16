"use client";

import { useEffect, useRef, useState } from "react";
import { pickMaNoShoQuote } from "@/lib/home-intro-quotes";
import { homeIntroHash, shouldSkipHomeIntro } from "@/lib/home-intro";

const STORAGE_KEY = "swij-home-intro-seen";

/**
 * タイムライン（クライアント処理開始からの ms）
 * 最初のイントロ「全体の表示時間」は 6 秒（この後 約0.9s で次のイントロへクロスフェード）。
 * 文章・タイミングは維持。スマホは完成見本に忠実なビジュアルへ再構成。
 */
const DELAY = {
  logo: 150,
  jp: 1100,
  en: 1450,
  data: 1800,
  maLabel: 2100,
  quote: 2400,
  author: 2700,
} as const;

const TEXT_RISE_MS = 600;
const MIN_HOLD_MS = 6000;
const MAX_FADE_START_MS = MIN_HOLD_MS + 200;
const FADE_MS = 900;

const HERO_IMAGE = "/melatonin-yoga.jpg";
const MARK_IMAGE = "/swij-logo-mark-round.png";
/** スマホ用：正式ロゴ（円形・透明背景）。演出レイヤーは CSS/SVG で重ねる */
const MARK_IMAGE_MOBILE = "/swij-logo-mark-round-clear.png";

const SERIF =
  '"Hiragino Mincho ProN", "Hiragino Mincho Pro", "Yu Mincho", "YuMincho", "Noto Serif JP", "Songti SC", serif';

function isLocalHost(): boolean {
  try {
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  } catch {
    return true;
  }
}

function quoteFontSize(len: number): string {
  if (len <= 22) return "clamp(0.95rem, 4.1vw, 1.08rem)";
  if (len <= 34) return "clamp(0.88rem, 3.7vw, 0.98rem)";
  if (len <= 46) return "clamp(0.8rem, 3.3vw, 0.9rem)";
  return "clamp(0.74rem, 3vw, 0.84rem)";
}

/**
 * トップページ専用イントロ（Hero 非依存・完全独立レイヤー）
 * スマホ版は完成見本に合わせて再構成。PC/タブレットは同構造の上品なスケール。
 */
export default function HomeIntro() {
  const [showIntro, setShowIntro] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);
  const [quote, setQuote] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    const hash = homeIntroHash();
    if (shouldSkipHomeIntro()) {
      doneRef.current = true;
      setShowIntro(false);
      const id = hash.slice(1);
      const scrollToTarget = () => {
        if (!id || id === "top") {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          document.getElementById("top")?.scrollIntoView({ block: "start" });
          return;
        }
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      };
      requestAnimationFrame(() => {
        scrollToTarget();
        window.setTimeout(scrollToTarget, 80);
      });
      return;
    }

    if (!isLocalHost()) {
      try {
        if (sessionStorage.getItem(STORAGE_KEY) === "1") {
          doneRef.current = true;
          setShowIntro(false);
          return;
        }
      } catch {
        // continue
      }
    }

    setQuote(pickMaNoShoQuote());
    setMounted(true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("swij-intro-active");

    const timers: number[] = [];
    const state = { minHold: false, heroReady: false, fadeStarted: false };

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (!isLocalHost()) {
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          // ignore
        }
      }
      document.body.style.overflow = prevOverflow;
      document.documentElement.classList.remove("swij-intro-active");
      setShowIntro(false);
    };

    const beginFade = () => {
      if (state.fadeStarted || doneRef.current) return;
      state.fadeStarted = true;
      setFading(true);
      timers.push(window.setTimeout(finish, FADE_MS));
    };

    const maybeFade = () => {
      if (state.minHold && state.heroReady) beginFade();
    };

    const markHeroReady = () => {
      state.heroReady = true;
      maybeFade();
    };
    try {
      const img = new window.Image();
      img.onload = markHeroReady;
      img.onerror = markHeroReady;
      img.src = HERO_IMAGE;
      if (img.complete && img.naturalWidth > 0) markHeroReady();
    } catch {
      state.heroReady = true;
    }

    // 正式ロゴを先読み（未デコード時のフラッシュ防止）
    try {
      const logo = new window.Image();
      logo.src = MARK_IMAGE_MOBILE;
    } catch {
      // ignore
    }

    timers.push(
      window.setTimeout(() => {
        state.minHold = true;
        maybeFade();
      }, MIN_HOLD_MS),
    );
    timers.push(window.setTimeout(beginFade, MAX_FADE_START_MS));

    return () => {
      for (const t of timers) window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.documentElement.classList.remove("swij-intro-active");
    };
  }, []);

  if (!showIntro) return null;

  const rise = (
    delayMs: number,
    opts?: { durationMs?: number },
  ): React.CSSProperties => {
    const dur = opts?.durationMs ?? TEXT_RISE_MS;
    if (!mounted) return { opacity: 0 };
    return {
      animation: `swij-intro-rise ${dur}ms cubic-bezier(0.22, 0.61, 0.36, 1) ${delayMs}ms both`,
    };
  };

  return (
    <div
      data-swij-intro=""
      data-swij-intro-v2=""
      role="dialog"
      aria-modal="true"
      aria-label="Sleep Wellness Institute Japan"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 2147483647,
        background: "#020b1a",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "all",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
        margin: 0,
        padding: 0,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        overflow: "hidden",
      }}
    >
      <style>{`
        [data-swij-intro-v2] {
          --intro-gold: #c9a45a;
          --intro-gold-soft: rgba(201, 164, 90, 0.88);
        }

        /*
          スマホロゴ周辺演出（サンプル2寄せ・Safari安全）:
          - 正式ロゴ画像は加工しない
          - wrap/img に box-shadow・背景色を付けない
          - 発光は円形/楕円 radial + mask
          - 軌道は少数の長い楕円 SVG
          順序: 青い光 → ロゴ → 外周発光 → 軌道 → ゴールド
        */
        @keyframes swij-intro-mark-emerge {
          0% {
            opacity: 0;
            transform: scale(0.94);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes swij-intro-mark-sharpen {
          0% { filter: blur(5px); }
          100% { filter: blur(0); }
        }
        @keyframes swij-intro-layer-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes swij-intro-glow-emerge {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.88);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes swij-intro-wave-emerge {
          0% {
            opacity: 0;
            transform: translate(-50%, -8%) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -8%) scale(1);
          }
        }

        /* ===== スマホ最優先（見本再現） ===== */
        @media (max-width: 767px) {
          [data-swij-intro-v2] .intro-stage {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding:
              calc(env(safe-area-inset-top, 0px) + 13.5vh - 1cm)
              28px
              calc(env(safe-area-inset-bottom, 0px) + 3.5vh + 1cm);
            box-sizing: border-box;
          }

          [data-swij-intro-v2] .intro-logo-wrap {
            position: relative;
            /* 従来の約 80% サイズ */
            width: min(43.2vw, 176px);
            height: min(43.2vw, 176px);
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            background: transparent !important;
            background-color: transparent !important;
            box-shadow: none !important;
            border: none !important;
            outline: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            mix-blend-mode: normal !important;
            opacity: 1 !important;
            margin-bottom: 0.85rem;
            overflow: visible;
            isolation: auto;
          }

          /* 1) 背後の強いブルー放射（ロゴ直下はくり抜き、白い輪に見せない） */
          [data-swij-intro-v2] .intro-logo-bloom {
            position: absolute;
            left: 50%;
            top: 48%;
            width: 280%;
            height: 280%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
            background:
              radial-gradient(circle at 52% 48%, rgba(70, 160, 255, 0.48) 0%, rgba(40, 120, 230, 0.26) 24%, rgba(25, 80, 170, 0.12) 44%, rgba(10, 40, 90, 0.04) 58%, transparent 72%);
            -webkit-mask-image: radial-gradient(
              closest-side,
              transparent 0%,
              transparent 33%,
              rgba(0, 0, 0, 0.35) 40%,
              #000 52%,
              transparent 100%
            );
            mask-image: radial-gradient(
              closest-side,
              transparent 0%,
              transparent 33%,
              rgba(0, 0, 0, 0.35) 40%,
              #000 52%,
              transparent 100%
            );
            filter: none !important;
            box-shadow: none !important;
            opacity: 0;
          }

          /* ロゴ下のブルー光の波・土台 */
          [data-swij-intro-v2] .intro-logo-wave {
            position: absolute;
            left: 50%;
            top: 68%;
            width: 320%;
            height: 150%;
            transform: translate(-50%, -8%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1;
            background:
              radial-gradient(ellipse 70% 38% at 42% 40%, rgba(120, 190, 255, 0.42) 0%, rgba(70, 140, 230, 0.16) 38%, transparent 68%),
              radial-gradient(ellipse 85% 32% at 58% 52%, rgba(160, 210, 255, 0.28) 0%, transparent 65%),
              radial-gradient(ellipse 95% 28% at 35% 58%, rgba(90, 160, 240, 0.22) 0%, transparent 70%),
              radial-gradient(ellipse 60% 22% at 70% 45%, rgba(200, 230, 255, 0.18) 0%, transparent 62%);
            -webkit-mask-image:
              radial-gradient(ellipse 78% 48% at 50% 38%, #000 18%, rgba(0,0,0,0.55) 45%, transparent 78%);
            mask-image:
              radial-gradient(ellipse 78% 48% at 50% 38%, #000 18%, rgba(0,0,0,0.55) 45%, transparent 78%);
            filter: none !important;
            box-shadow: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-wave-soft {
            position: absolute;
            left: 50%;
            top: 74%;
            width: 300%;
            height: 110%;
            transform: translate(-50%, 0);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1;
            background:
              radial-gradient(ellipse 90% 40% at 48% 30%, rgba(140, 195, 255, 0.2) 0%, transparent 70%);
            -webkit-mask-image: radial-gradient(ellipse 85% 50% at 50% 30%, #000 10%, transparent 75%);
            mask-image: radial-gradient(ellipse 85% 50% at 50% 30%, #000 10%, transparent 75%);
            filter: none !important;
            opacity: 0;
          }

          /* 微細光粒（少量） */
          [data-swij-intro-v2] .intro-logo-sparkles {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 260%;
            height: 260%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 2;
            background-image:
              radial-gradient(1.3px 1.3px at 16% 26%, rgba(255, 255, 255, 0.55), transparent),
              radial-gradient(1px 1px at 82% 18%, rgba(200, 230, 255, 0.45), transparent),
              radial-gradient(1.1px 1.1px at 88% 52%, rgba(255, 255, 255, 0.32), transparent),
              radial-gradient(1px 1px at 10% 58%, rgba(180, 220, 255, 0.4), transparent),
              radial-gradient(1.2px 1.2px at 68% 78%, rgba(255, 255, 255, 0.28), transparent),
              radial-gradient(0.9px 0.9px at 40% 12%, rgba(220, 240, 255, 0.35), transparent);
            -webkit-mask-image: radial-gradient(closest-side, #000 38%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 38%, transparent 100%);
            filter: none !important;
            opacity: 0;
          }

          /* 外周の空間光：白く膨らませず、青寄りに拡散 */
          [data-swij-intro-v2] .intro-logo-glow {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 200%;
            height: 200%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 3;
            background:
              radial-gradient(
                circle at 50% 48%,
                rgba(100, 180, 255, 0.14) 0%,
                rgba(60, 140, 240, 0.08) 30%,
                rgba(40, 110, 210, 0.04) 50%,
                transparent 68%
              );
            -webkit-mask-image: radial-gradient(closest-side, #000 50%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 50%, transparent 100%);
            filter: none !important;
            box-shadow: none !important;
            opacity: 0;
          }

          /* 右側〜右下の鮮やかブルー寄り */
          [data-swij-intro-v2] .intro-logo-glow-blue {
            position: absolute;
            left: 60%;
            top: 58%;
            width: 115%;
            height: 115%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 3;
            background:
              radial-gradient(
                circle at 38% 38%,
                rgba(100, 200, 255, 0.42) 0%,
                rgba(50, 150, 255, 0.2) 34%,
                rgba(30, 100, 220, 0.08) 56%,
                transparent 72%
              );
            -webkit-mask-image: radial-gradient(closest-side, #000 46%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 46%, transparent 100%);
            filter: none !important;
            opacity: 0;
          }

          /*
            太い白い輪は使わない。
            縁の発光は SVG の細い円ストローク（.intro-logo-rim-svg）に任せる。
          */
          [data-swij-intro-v2] .intro-logo-glow-core,
          [data-swij-intro-v2] .intro-logo-glow-rim {
            display: none !important;
          }

          [data-swij-intro-v2] .intro-logo-rim-svg {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 106%;
            height: 106%;
            transform: translate(-50%, -50%);
            overflow: visible;
            pointer-events: none;
            z-index: 4;
            background: transparent !important;
            filter: none !important;
            opacity: 0;
          }

          /* 左下 7〜8時のゴールド光源（レンズフレア風・丸見え防止） */
          [data-swij-intro-v2] .intro-logo-warm {
            position: absolute;
            left: -2%;
            top: 52%;
            width: 70%;
            height: 70%;
            border-radius: 50%;
            pointer-events: none;
            z-index: 5;
            background:
              radial-gradient(circle at 45% 42%, rgba(255, 255, 252, 1) 0%, rgba(255, 240, 210, 0.85) 6%, rgba(255, 210, 140, 0.45) 18%, rgba(240, 170, 80, 0.18) 36%, rgba(200, 130, 50, 0.06) 52%, transparent 68%),
              radial-gradient(ellipse 90% 55% at 28% 58%, rgba(255, 200, 120, 0.28) 0%, transparent 60%);
            -webkit-mask-image: radial-gradient(closest-side, #000 42%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 42%, transparent 100%);
            filter: none !important;
            box-shadow: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-warm-streak {
            position: absolute;
            left: 6%;
            top: 60%;
            width: 55%;
            height: 28%;
            border-radius: 50%;
            pointer-events: none;
            z-index: 5;
            background:
              radial-gradient(ellipse 100% 70% at 30% 50%, rgba(255, 230, 180, 0.35) 0%, rgba(255, 190, 100, 0.12) 40%, transparent 70%);
            -webkit-mask-image: radial-gradient(ellipse closest-side, #000 35%, transparent 100%);
            mask-image: radial-gradient(ellipse closest-side, #000 35%, transparent 100%);
            transform: rotate(-28deg);
            filter: none !important;
            opacity: 0;
          }

          /* 長い楕円軌道（少数・主役にしない） */
          [data-swij-intro-v2] .intro-logo-orbits {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 210%;
            height: 210%;
            transform: translate(-50%, -50%);
            overflow: visible;
            pointer-events: none;
            z-index: 6;
            background: transparent !important;
            filter: none !important;
            opacity: 0;
          }

          /* 正式ロゴ */
          [data-swij-intro-v2] .intro-logo-mark {
            position: relative;
            z-index: 7;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            overflow: hidden;
            background: transparent !important;
            background-color: transparent !important;
            box-shadow: none !important;
            -webkit-mask-image: radial-gradient(closest-side, #000 99.6%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 99.6%, transparent 100%);
            transform: translateZ(0);
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-mark picture {
            display: contents;
            background: transparent !important;
          }

          [data-swij-intro-v2] .intro-logo-mark img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            mix-blend-mode: normal !important;
          }

          /* 登場順: 青光 → ロゴ → 外周 → 軌道 → ゴールド */
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-bloom {
            animation: swij-intro-glow-emerge 1100ms ease-out 60ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-wave {
            animation: swij-intro-wave-emerge 1200ms ease-out 100ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-wave-soft,
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-sparkles {
            animation: swij-intro-layer-in 1200ms ease-out 140ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark {
            animation: swij-intro-mark-emerge 1300ms cubic-bezier(0.22, 0.61, 0.36, 1) 320ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark img {
            animation: swij-intro-mark-sharpen 1300ms cubic-bezier(0.22, 0.61, 0.36, 1) 320ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow,
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow-blue,
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-rim-svg {
            animation: swij-intro-glow-emerge 1100ms ease-out 620ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-orbits {
            animation: swij-intro-layer-in 1100ms ease-out 900ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-warm,
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-warm-streak {
            animation: swij-intro-layer-in 1000ms ease-out 1050ms both;
          }

          @media (prefers-reduced-motion: reduce) {
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-bloom,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-wave,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-wave-soft,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-sparkles,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark img,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow-blue,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-rim-svg,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-orbits,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-warm,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-warm-streak {
              animation: none !important;
              opacity: 1 !important;
              filter: none !important;
            }
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-bloom,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow {
              transform: translate(-50%, -50%) !important;
            }
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-rim-svg {
              transform: translate(-50%, -50%) !important;
            }
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark {
              transform: none !important;
            }
          }

          [data-swij-intro-v2] .intro-mid {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            width: 100%;
            padding: 1.7rem 0 0.8rem;
            transform: translateY(4mm);
          }

          [data-swij-intro-v2] .intro-jp {
            margin: 0;
            color: #fff;
            font-family: ${SERIF};
            font-size: clamp(1.55rem, 6.6vw, 1.85rem);
            font-weight: 500;
            letter-spacing: 0.06em;
            line-height: 1.45;
            text-shadow: 0 0 24px rgba(180, 210, 255, 0.18);
          }

          [data-swij-intro-v2] .intro-en {
            margin: 1.15rem 0 0;
            color: rgba(255, 255, 255, 0.78);
            font-family: ${SERIF};
            font-size: clamp(0.72rem, 3.1vw, 0.84rem);
            font-weight: 400;
            letter-spacing: 0.04em;
            line-height: 1.6;
          }

          [data-swij-intro-v2] .intro-data {
            margin: 1.35rem 0 0;
            color: var(--intro-gold-soft);
            font-size: 0.58rem;
            font-weight: 600;
            letter-spacing: 0.38em;
            text-indent: 0.38em;
          }

          [data-swij-intro-v2] .intro-data-flare {
            margin-top: 0.55rem;
            width: 42px;
            height: 1px;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.75),
              rgba(201, 164, 90, 0.9),
              rgba(255, 255, 255, 0.75),
              transparent
            );
            box-shadow: 0 0 10px rgba(200, 220, 255, 0.55);
          }

          [data-swij-intro-v2] .intro-bottom {
            position: relative;
            flex: 0 0 auto;
            width: min(82vw, 318px);
            height: min(82vw, 318px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            margin-top: 0.2rem;
          }

          [data-swij-intro-v2] .intro-enso {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 1px solid rgba(210, 225, 245, 0.22);
            box-shadow:
              0 0 40px rgba(120, 170, 220, 0.08),
              inset 0 0 50px rgba(120, 170, 220, 0.05);
            pointer-events: none;
            animation-name: swij-intro-enso-fade !important;
          }

          @keyframes swij-intro-enso-fade {
            from { opacity: 0; transform: none; }
            to { opacity: 1; transform: none; }
          }

          [data-swij-intro-v2] .intro-ma-label {
            position: relative;
            margin: 0;
            color: var(--intro-gold-soft);
            font-size: calc(0.62rem * 1.4);
            font-weight: 600;
            letter-spacing: 0.36em;
            text-indent: 0.36em;
          }

          [data-swij-intro-v2] .intro-ma-rule {
            position: relative;
            margin-top: 0.55rem;
            width: 28px;
            height: 1px;
            background: rgba(201, 164, 90, 0.7);
          }

          [data-swij-intro-v2] .intro-quote {
            position: relative;
            margin: 0.95rem 1.4rem 0;
            color: rgba(255, 255, 255, 0.94);
            font-family: ${SERIF};
            font-weight: 400;
            letter-spacing: 0.04em;
            line-height: 1.9;
            max-height: 5.8rem;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          [data-swij-intro-v2] .intro-author {
            position: relative;
            margin: 0.95rem 0 0;
            color: rgba(255, 255, 255, 0.55);
            font-family: ${SERIF};
            font-size: calc(0.62rem * 1.4);
            font-weight: 400;
            letter-spacing: 0.14em;
          }
        }

        /* ===== PC / タブレット ===== */
        @media (min-width: 768px) {
          [data-swij-intro-v2] .intro-stage {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: clamp(56px, 10vh, 96px) 32px clamp(48px, 8vh, 88px);
            box-sizing: border-box;
          }

          [data-swij-intro-v2] .intro-logo-wrap {
            position: relative;
            width: clamp(140px, 18vw, 196px);
            height: clamp(140px, 18vw, 196px);
            display: grid;
            place-items: center;
            flex: 0 0 auto;
            background: transparent !important;
            background-color: transparent !important;
            box-shadow: none !important;
            border: none !important;
            outline: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            mix-blend-mode: normal !important;
            opacity: 1 !important;
            margin-bottom: 0.85rem;
            overflow: visible;
            isolation: auto;
          }

          /* PCでもスマホと同じロゴ周りの光・軌道・ゴールド演出を復元 */
          [data-swij-intro-v2] .intro-logo-bloom {
            position: absolute;
            left: 50%;
            top: 48%;
            width: 280%;
            height: 280%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
            background:
              radial-gradient(circle at 52% 48%, rgba(70, 160, 255, 0.48) 0%, rgba(40, 120, 230, 0.26) 24%, rgba(25, 80, 170, 0.12) 44%, rgba(10, 40, 90, 0.04) 58%, transparent 72%);
            -webkit-mask-image: radial-gradient(
              closest-side,
              transparent 0%,
              transparent 33%,
              rgba(0, 0, 0, 0.35) 40%,
              #000 52%,
              transparent 100%
            );
            mask-image: radial-gradient(
              closest-side,
              transparent 0%,
              transparent 33%,
              rgba(0, 0, 0, 0.35) 40%,
              #000 52%,
              transparent 100%
            );
            filter: none !important;
            box-shadow: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-wave {
            position: absolute;
            left: 50%;
            top: 68%;
            width: 320%;
            height: 150%;
            transform: translate(-50%, -8%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1;
            background:
              radial-gradient(ellipse 70% 38% at 42% 40%, rgba(120, 190, 255, 0.42) 0%, rgba(70, 140, 230, 0.16) 38%, transparent 68%),
              radial-gradient(ellipse 85% 32% at 58% 52%, rgba(160, 210, 255, 0.28) 0%, transparent 65%),
              radial-gradient(ellipse 95% 28% at 35% 58%, rgba(90, 160, 240, 0.22) 0%, transparent 70%),
              radial-gradient(ellipse 60% 22% at 70% 45%, rgba(200, 230, 255, 0.18) 0%, transparent 62%);
            -webkit-mask-image:
              radial-gradient(ellipse 78% 48% at 50% 38%, #000 18%, rgba(0,0,0,0.55) 45%, transparent 78%);
            mask-image:
              radial-gradient(ellipse 78% 48% at 50% 38%, #000 18%, rgba(0,0,0,0.55) 45%, transparent 78%);
            filter: none !important;
            box-shadow: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-wave-soft {
            position: absolute;
            left: 50%;
            top: 74%;
            width: 300%;
            height: 110%;
            transform: translate(-50%, 0);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1;
            background:
              radial-gradient(ellipse 90% 40% at 48% 30%, rgba(140, 195, 255, 0.2) 0%, transparent 70%);
            -webkit-mask-image: radial-gradient(ellipse 85% 50% at 50% 30%, #000 10%, transparent 75%);
            mask-image: radial-gradient(ellipse 85% 50% at 50% 30%, #000 10%, transparent 75%);
            filter: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-sparkles {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 260%;
            height: 260%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 2;
            background-image:
              radial-gradient(1.3px 1.3px at 16% 26%, rgba(255, 255, 255, 0.55), transparent),
              radial-gradient(1px 1px at 82% 18%, rgba(200, 230, 255, 0.45), transparent),
              radial-gradient(1.1px 1.1px at 88% 52%, rgba(255, 255, 255, 0.32), transparent),
              radial-gradient(1px 1px at 10% 58%, rgba(180, 220, 255, 0.4), transparent),
              radial-gradient(1.2px 1.2px at 68% 78%, rgba(255, 255, 255, 0.28), transparent),
              radial-gradient(0.9px 0.9px at 40% 12%, rgba(220, 240, 255, 0.35), transparent);
            -webkit-mask-image: radial-gradient(closest-side, #000 38%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 38%, transparent 100%);
            filter: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-glow {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 200%;
            height: 200%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 3;
            background:
              radial-gradient(
                circle at 50% 48%,
                rgba(100, 180, 255, 0.14) 0%,
                rgba(60, 140, 240, 0.08) 30%,
                rgba(40, 110, 210, 0.04) 50%,
                transparent 68%
              );
            -webkit-mask-image: radial-gradient(closest-side, #000 50%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 50%, transparent 100%);
            filter: none !important;
            box-shadow: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-glow-blue {
            position: absolute;
            left: 60%;
            top: 58%;
            width: 115%;
            height: 115%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 3;
            background:
              radial-gradient(
                circle at 38% 38%,
                rgba(100, 200, 255, 0.42) 0%,
                rgba(50, 150, 255, 0.2) 34%,
                rgba(30, 100, 220, 0.08) 56%,
                transparent 72%
              );
            -webkit-mask-image: radial-gradient(closest-side, #000 46%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 46%, transparent 100%);
            filter: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-glow-core,
          [data-swij-intro-v2] .intro-logo-glow-rim {
            display: none !important;
          }

          [data-swij-intro-v2] .intro-logo-rim-svg {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 106%;
            height: 106%;
            transform: translate(-50%, -50%);
            overflow: visible;
            pointer-events: none;
            z-index: 4;
            background: transparent !important;
            filter: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-warm {
            position: absolute;
            left: -2%;
            top: 52%;
            width: 70%;
            height: 70%;
            border-radius: 50%;
            pointer-events: none;
            z-index: 5;
            background:
              radial-gradient(circle at 45% 42%, rgba(255, 255, 252, 1) 0%, rgba(255, 240, 210, 0.85) 6%, rgba(255, 210, 140, 0.45) 18%, rgba(240, 170, 80, 0.18) 36%, rgba(200, 130, 50, 0.06) 52%, transparent 68%),
              radial-gradient(ellipse 90% 55% at 28% 58%, rgba(255, 200, 120, 0.28) 0%, transparent 60%);
            -webkit-mask-image: radial-gradient(closest-side, #000 42%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 42%, transparent 100%);
            filter: none !important;
            box-shadow: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-warm-streak {
            position: absolute;
            left: 6%;
            top: 60%;
            width: 55%;
            height: 28%;
            border-radius: 50%;
            pointer-events: none;
            z-index: 5;
            background:
              radial-gradient(ellipse 100% 70% at 30% 50%, rgba(255, 230, 180, 0.35) 0%, rgba(255, 190, 100, 0.12) 40%, transparent 70%);
            -webkit-mask-image: radial-gradient(ellipse closest-side, #000 35%, transparent 100%);
            mask-image: radial-gradient(ellipse closest-side, #000 35%, transparent 100%);
            transform: rotate(-28deg);
            filter: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-orbits {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 210%;
            height: 210%;
            transform: translate(-50%, -50%);
            overflow: visible;
            pointer-events: none;
            z-index: 6;
            background: transparent !important;
            filter: none !important;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-mark {
            position: relative;
            z-index: 7;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            overflow: hidden;
            background: transparent !important;
            background-color: transparent !important;
            box-shadow: none !important;
            -webkit-mask-image: radial-gradient(closest-side, #000 99.6%, transparent 100%);
            mask-image: radial-gradient(closest-side, #000 99.6%, transparent 100%);
            transform: translateZ(0);
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            opacity: 0;
          }

          [data-swij-intro-v2] .intro-logo-mark picture {
            display: contents;
            background: transparent !important;
          }

          [data-swij-intro-v2] .intro-logo-mark img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            mix-blend-mode: normal !important;
          }

          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-bloom {
            animation: swij-intro-glow-emerge 1100ms ease-out 60ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-wave {
            animation: swij-intro-wave-emerge 1200ms ease-out 100ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-wave-soft,
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-sparkles {
            animation: swij-intro-layer-in 1200ms ease-out 140ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark {
            animation: swij-intro-mark-emerge 1300ms cubic-bezier(0.22, 0.61, 0.36, 1) 320ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark img {
            animation: swij-intro-mark-sharpen 1300ms cubic-bezier(0.22, 0.61, 0.36, 1) 320ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow,
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow-blue,
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-rim-svg {
            animation: swij-intro-glow-emerge 1100ms ease-out 620ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-orbits {
            animation: swij-intro-layer-in 1100ms ease-out 900ms both;
          }
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-warm,
          [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-warm-streak {
            animation: swij-intro-layer-in 1000ms ease-out 1050ms both;
          }

          @media (prefers-reduced-motion: reduce) {
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-bloom,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-wave,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-wave-soft,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-sparkles,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark img,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow-blue,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-rim-svg,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-orbits,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-warm,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-warm-streak {
              animation: none !important;
              opacity: 1 !important;
              filter: none !important;
            }
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-bloom,
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-glow {
              transform: translate(-50%, -50%) !important;
            }
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-rim-svg {
              transform: translate(-50%, -50%) !important;
            }
            [data-swij-intro-v2] .intro-logo-wrap.intro-logo-on .intro-logo-mark {
              transform: none !important;
            }
          }

          [data-swij-intro-v2] .intro-data-flare,
          [data-swij-intro-v2] .intro-ma-rule {
            display: none;
          }

          [data-swij-intro-v2] .intro-mid {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            width: min(100%, 30rem);
          }

          [data-swij-intro-v2] .intro-jp {
            margin: 0;
            color: #fff;
            font-size: clamp(1.4rem, 5vw, 1.9rem);
            font-weight: 600;
            letter-spacing: -0.03em;
            line-height: 1.3;
          }

          [data-swij-intro-v2] .intro-en {
            margin: 1.3rem 0 0;
            color: rgba(255, 255, 255, 0.5);
            font-size: clamp(0.72rem, 2.4vw, 0.86rem);
            font-weight: 500;
            letter-spacing: 0.09em;
          }

          [data-swij-intro-v2] .intro-data {
            margin: 1.5rem 0 0;
            color: rgba(216, 179, 106, 0.85);
            font-size: 0.6rem;
            font-weight: 600;
            letter-spacing: 0.34em;
          }

          [data-swij-intro-v2] .intro-bottom {
            position: relative;
            flex: 0 0 auto;
            width: min(100%, 30rem);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            min-height: 9.5rem;
          }

          [data-swij-intro-v2] .intro-enso {
            position: absolute;
            top: 54%;
            left: 50%;
            width: min(56vw, 210px);
            height: min(56vw, 210px);
            transform: translate(-50%, -50%);
            border-radius: 50%;
            border: 1px solid rgba(216, 179, 106, 0.12);
            box-shadow: inset 0 0 42px rgba(216, 179, 106, 0.05);
            pointer-events: none;
          }

          [data-swij-intro-v2] .intro-ma-label {
            position: relative;
            margin: 0;
            color: rgba(216, 179, 106, 0.74);
            font-size: calc(0.62rem * 1.4);
            font-weight: 600;
            letter-spacing: 0.34em;
          }

          [data-swij-intro-v2] .intro-quote {
            position: relative;
            margin: 0.95rem auto 0;
            max-width: 28rem;
            color: rgba(255, 255, 255, 0.94);
            font-weight: 500;
            letter-spacing: 0.01em;
            line-height: 1.85;
            height: clamp(5rem, 17vw, 6.1rem);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          [data-swij-intro-v2] .intro-author {
            position: relative;
            margin: 0.85rem 0 0;
            color: rgba(255, 255, 255, 0.42);
            font-size: calc(0.62rem * 1.4);
            font-weight: 500;
            letter-spacing: 0.12em;
          }
        }
      `}</style>

      {/* 濃紺ベース */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 90% at 50% 18%, #0c2442 0%, #07182e 42%, #030d1c 72%, #020914 100%)",
          opacity: mounted ? 1 : 0,
          transition: "opacity 1300ms ease-out",
          pointerEvents: "none",
        }}
      />

      {/* 上部の青白い霞・波光 */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-20%",
          right: "-20%",
          top: "2%",
          height: "42%",
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(170,210,250,0.26) 0%, rgba(110,160,220,0.1) 40%, transparent 70%)",
          filter: "blur(10px)",
          opacity: mounted ? 1 : 0,
          transition: "opacity 1600ms ease-out",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10%",
          right: "-10%",
          top: "12%",
          height: "24%",
          background:
            "linear-gradient(100deg, transparent 0%, rgba(170,205,240,0.09) 28%, rgba(210,230,255,0.16) 50%, rgba(170,205,240,0.09) 72%, transparent 100%)",
          filter: "blur(18px)",
          transform: "skewY(-5deg)",
          opacity: mounted ? 0.95 : 0,
          transition: "opacity 1800ms ease-out",
          pointerEvents: "none",
        }}
      />

      {/* 下部の柔らかい青い光・波 */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-15%",
          right: "-15%",
          bottom: "-4%",
          height: "38%",
          background:
            "radial-gradient(ellipse at 50% 78%, rgba(130,180,240,0.22) 0%, rgba(70,120,180,0.09) 44%, transparent 72%)",
          filter: "blur(12px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "4%",
          height: "22%",
          background:
            "linear-gradient(90deg, transparent, rgba(150,190,230,0.1) 30%, rgba(190,220,255,0.16) 50%, rgba(150,190,230,0.1) 70%, transparent)",
          filter: "blur(14px)",
          pointerEvents: "none",
        }}
      />

      <div className="intro-stage">
        {/* ① ロゴ＋軌道光 */}
        <div
          data-swij-intro-logo=""
          className={`intro-logo-wrap${mounted ? " intro-logo-on" : ""}`}
        >
          <div className="intro-logo-bloom" aria-hidden="true" />
          <div className="intro-logo-wave" aria-hidden="true" />
          <div className="intro-logo-wave-soft" aria-hidden="true" />
          <div className="intro-logo-sparkles" aria-hidden="true" />
          <div className="intro-logo-glow" aria-hidden="true" />
          <div className="intro-logo-glow-blue" aria-hidden="true" />
          <svg
            className="intro-logo-rim-svg"
            viewBox="0 0 100 100"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id="swijRimGrad" x1="15%" y1="20%" x2="85%" y2="80%">
                <stop offset="0%" stopColor="rgba(255,230,190,0.35)" />
                <stop offset="35%" stopColor="rgba(220,245,255,0.75)" />
                <stop offset="70%" stopColor="rgba(100,190,255,0.85)" />
                <stop offset="100%" stopColor="rgba(60,150,255,0.45)" />
              </linearGradient>
            </defs>
            {/* ロゴ縁に密着した細い発光リング（ふわ白輪を作らない） */}
            <circle
              cx="50"
              cy="50"
              r="48.35"
              fill="none"
              stroke="url(#swijRimGrad)"
              strokeWidth="0.7"
              opacity="0.95"
            />
            <circle
              cx="50"
              cy="50"
              r="48.35"
              fill="none"
              stroke="rgba(80,170,255,0.22)"
              strokeWidth="1.4"
              opacity="0.5"
            />
          </svg>
          <div className="intro-logo-warm" aria-hidden="true" />
          <div className="intro-logo-warm-streak" aria-hidden="true" />
          <svg
            className="intro-logo-orbits"
            viewBox="0 0 100 100"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id="swijOrbitA" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(200,230,255,0.05)" />
                <stop offset="28%" stopColor="rgba(230,245,255,0.55)" />
                <stop offset="52%" stopColor="rgba(180,220,255,0.12)" />
                <stop offset="78%" stopColor="rgba(240,250,255,0.45)" />
                <stop offset="100%" stopColor="rgba(170,210,255,0.06)" />
              </linearGradient>
              <linearGradient id="swijOrbitB" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(160,210,255,0.04)" />
                <stop offset="35%" stopColor="rgba(210,235,255,0.28)" />
                <stop offset="70%" stopColor="rgba(255,255,255,0.5)" />
                <stop offset="100%" stopColor="rgba(150,200,255,0.05)" />
              </linearGradient>
              <linearGradient id="swijOrbitC" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="rgba(180,220,255,0.03)" />
                <stop offset="45%" stopColor="rgba(200,230,255,0.18)" />
                <stop offset="100%" stopColor="rgba(170,210,255,0.04)" />
              </linearGradient>
            </defs>
            <g fill="none" strokeLinecap="round">
              {/* メイン: 左下→前方→右上へ大きく回る */}
              <ellipse
                cx="50"
                cy="50"
                rx="46"
                ry="22"
                transform="rotate(-38 50 50)"
                stroke="url(#swijOrbitA)"
                strokeWidth="0.55"
              />
              {/* サブ軌道 */}
              <ellipse
                cx="50"
                cy="50"
                rx="43"
                ry="18"
                transform="rotate(28 50 50)"
                stroke="url(#swijOrbitB)"
                strokeWidth="0.4"
              />
              {/* ごく薄い補助 */}
              <ellipse
                cx="50"
                cy="50"
                rx="40"
                ry="15"
                transform="rotate(68 50 50)"
                stroke="url(#swijOrbitC)"
                strokeWidth="0.3"
              />
              {/* 右上の強い光点（白〜ゴールド） */}
              <circle cx="78" cy="24" r="1.35" fill="rgba(255,255,255,0.98)" />
              <circle cx="78" cy="24" r="2.8" fill="rgba(255,230,180,0.35)" />
              <circle cx="78" cy="24" r="4.2" fill="rgba(255,210,140,0.12)" />
              {/* 軌道上の控えめな光点 */}
              <circle cx="18" cy="58" r="0.7" fill="rgba(230,245,255,0.85)" />
              <circle cx="18" cy="58" r="1.6" fill="rgba(180,220,255,0.22)" />
              <circle cx="62" cy="78" r="0.5" fill="rgba(210,235,255,0.7)" />
            </g>
          </svg>
          <div className="intro-logo-mark">
            <picture>
              <source media="(max-width: 767px)" srcSet={MARK_IMAGE_MOBILE} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MARK_IMAGE}
                alt="Sleep Wellness Institute Japan"
                width={220}
                height={220}
                decoding="async"
                style={{ background: "transparent", backgroundColor: "transparent" }}
              />
            </picture>
          </div>
        </div>

        {/* ② 中央コピー */}
        <div className="intro-mid">
          <p
            data-swij-rise=""
            className="intro-jp"
            style={rise(DELAY.jp)}
          >
            睡眠を、人生の土台へ。
          </p>
          <p
            data-swij-rise=""
            className="intro-en"
            style={rise(DELAY.en)}
          >
            Sleep as the Foundation of Life.
          </p>
          <p
            data-swij-rise=""
            className="intro-data"
            style={rise(DELAY.data)}
          >
            DATA × AI × PRACTICE
          </p>
          <div
            data-swij-rise=""
            className="intro-data-flare"
            aria-hidden="true"
            style={rise(DELAY.data, { durationMs: 800 })}
          />
        </div>

        {/* ③ 下部・円相の中に間の書 */}
        <div className="intro-bottom">
          <div
            data-swij-intro-enso=""
            className="intro-enso"
            aria-hidden="true"
            style={{
              opacity: 0,
              animation: mounted
                ? `swij-intro-enso 1200ms ease-out ${DELAY.quote}ms both`
                : "none",
            }}
          />
          <p
            data-swij-rise=""
            className="intro-ma-label"
            style={rise(DELAY.maLabel)}
          >
            間の書
          </p>
          <div
            data-swij-rise=""
            className="intro-ma-rule"
            aria-hidden="true"
            style={rise(DELAY.maLabel, { durationMs: 700 })}
          />
          <p
            data-swij-rise=""
            lang="ja"
            className="intro-quote"
            style={{
              fontSize: quoteFontSize(quote.length),
              ...rise(DELAY.quote),
            }}
          >
            {quote ? `「${quote}」` : "\u00a0"}
          </p>
          <p
            data-swij-rise=""
            className="intro-author"
            style={rise(DELAY.author)}
          >
            著者　綿本哲
          </p>
        </div>
      </div>
    </div>
  );
}
