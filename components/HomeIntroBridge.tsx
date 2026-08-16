"use client";

import { useEffect, useState } from "react";
import { shouldSkipHomeIntro } from "@/lib/home-intro";

/**
 * 中間イントロ（ブリッジ）。
 *
 * 既存の HomeIntro（[data-swij-intro]）が完了して DOM から消えた後に表示し、
 * 全体で約 3 秒表示したあと、自然にフェードアウトしてトップページへ移行する。
 *
 * 重要:
 * - 既存 HomeIntro・globals.css・トップページには一切変更を加えない「追加」実装。
 * - スタイルはこのコンポーネント内にスコープした <style>（swijb- 接頭辞）で完結。
 * - 既存の `swij-intro-active` クラスのみ再利用し、BETA/ハンバーガーの非表示を継続する。
 */
const STORAGE_KEY = "swij-home-intro-seen";

// 「showing」開始からの ms
// 次のイントロ「全体の表示時間」は 3 秒（この後トップへゆっくりクロスフェード）。
const VISIBLE_MS = 3000;
const FADE_MS = 800; // トップページへゆっくりクロスフェード
const FADE_START_MS = VISIBLE_MS;

const NAVY_GRADIENT =
  "radial-gradient(120% 120% at 50% 32%, #0b2038 0%, #081830 46%, #050f1f 100%)";
const GOLD = "#d8b36a";
const BG_IMAGE = "/intro-bridge-bg.png";

type Phase = "init" | "waiting" | "showing" | "fading" | "done";

function isLocalHost(): boolean {
  try {
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  } catch {
    return true;
  }
}

export default function HomeIntroBridge() {
  const [phase, setPhase] = useState<Phase>("init");
  // ロゴイントロのフェードアウト開始に合わせて、背景を先行フェードインさせるフラグ。
  const [bgIn, setBgIn] = useState(false);

  // 参加判定 → 既存イントロの完了（要素消失）を待つ
  useEffect(() => {
    if (shouldSkipHomeIntro()) {
      setPhase("done");
      return;
    }

    if (!isLocalHost()) {
      try {
        if (sessionStorage.getItem(STORAGE_KEY) === "1") {
          setPhase("done");
          return;
        }
      } catch {
        // 読めなければ通常フロー
      }
    }

    setPhase("waiting");

    let raf = 0;
    let cancelled = false;
    let sawIntro = false;
    let bgStarted = false;
    const startedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const MAX_WAIT_MS = 20000; // 保険

    const now = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector("[data-swij-intro]");
      if (el) {
        sawIntro = true;
        // 既存ロゴイントロがフェードアウトを開始した瞬間に、中間イントロ背景の
        // フェードインを重ねて開始する（間の「暗い無表示」時間をなくす）。
        if (!bgStarted) {
          const cs = getComputedStyle(el);
          if (parseFloat(cs.opacity) < 0.98 || cs.pointerEvents === "none") {
            bgStarted = true;
            document.documentElement.classList.add("swij-intro-active");
            document.body.style.overflow = "hidden";
            setBgIn(true);
          }
        }
      }
      const gone = sawIntro && !el;
      const timedOut = now() - startedAt > MAX_WAIT_MS;
      if (gone || timedOut) {
        // 既存イントロが class を外した直後の一瞬のちらつきを防ぐため同期的に再付与
        document.documentElement.classList.add("swij-intro-active");
        document.body.style.overflow = "hidden";
        setBgIn(true);
        setPhase("showing");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // 表示 → 静止 → フェード開始
  useEffect(() => {
    if (phase !== "showing") return;
    document.documentElement.classList.add("swij-intro-active");
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => setPhase("fading"), FADE_START_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // フェード完了 → 後始末して終了
  useEffect(() => {
    if (phase !== "fading") return;
    const t = window.setTimeout(() => {
      document.body.style.overflow = "";
      document.documentElement.classList.remove("swij-intro-active");
      if (!isLocalHost()) {
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          // ignore
        }
      }
      setPhase("done");
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // アンマウント時の保険
  useEffect(
    () => () => {
      document.body.style.overflow = "";
      document.documentElement.classList.remove("swij-intro-active");
    },
    [],
  );

  if (phase === "init" || phase === "done") return null;

  const active = phase === "showing" || phase === "fading";
  const fading = phase === "fading";

  const rise = (delayMs: number): React.CSSProperties => {
    if (!active) return { opacity: 0 };
    return {
      animation: `swijb-rise 760ms cubic-bezier(0.22, 0.61, 0.36, 1) ${delayMs}ms both`,
    };
  };

  return (
    <div
      data-swij-intro-bridge=""
      role="dialog"
      aria-modal="true"
      aria-label="Sleep Wellness Institute Japan"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2147483646,
        background: NAVY_GRADIENT,
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "all",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        margin: 0,
        padding: "clamp(40px, 9vh, 96px) 24px",
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        WebkitBackfaceVisibility: "hidden",
        transform: "translateZ(0)",
        willChange: "opacity",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes swijb-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes swijb-breath {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.045); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
        }
        @keyframes swijb-glow {
          0% { opacity: 0.5; }
          50% { opacity: 0.85; }
          100% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .swijb-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
          [data-swij-intro-bridge] .swijb-anim { animation: none !important; }
        }
      `}</style>

      {/* 背景: 夜の静かな和室・障子・窓・瞑想シルエット（下部に配置） */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BG_IMAGE}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center bottom",
          opacity: bgIn ? 1 : 0,
          transition: "opacity 760ms ease",
          pointerEvents: "none",
        }}
      />

      {/* 文字視認性のための暗いオーバーレイ（上ほど濃く・背景は暗く抑える） */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(5,15,31,0.9) 0%, rgba(6,18,36,0.72) 34%, rgba(6,18,36,0.5) 56%, rgba(5,15,31,0.64) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* 本文 */}
      <div
        style={{
          position: "relative",
          width: "min(100%, 34rem)",
          textAlign: "center",
        }}
      >
        <p
          className="swijb-rise"
          style={{
            margin: 0,
            color: "#ffffff",
            fontSize: "clamp(1.5rem, 6.2vw, 2.25rem)",
            fontWeight: 600,
            letterSpacing: "0.02em",
            lineHeight: 1.62,
            ...rise(120),
          }}
        >
          「間」をつくれば、
          <br />
          眠りは自然に訪れる。
        </p>

        <p
          className="swijb-rise"
          style={{
            margin: "clamp(1.8rem, 5vw, 2.6rem) 0 0",
            color: "rgba(255,255,255,0.78)",
            fontSize: "clamp(0.92rem, 3.6vw, 1.06rem)",
            fontWeight: 500,
            letterSpacing: "0.03em",
            lineHeight: 1.95,
            ...rise(650),
          }}
        >
          <span style={{ color: GOLD, fontWeight: 600 }}>日本文化</span>
          <span style={{ color: "rgba(255,255,255,0.5)", margin: "0 0.35em" }}>
            ×
          </span>
          <span style={{ color: GOLD, fontWeight: 600 }}>ヨガ</span>
          <span style={{ color: "rgba(255,255,255,0.5)", margin: "0 0.35em" }}>
            ×
          </span>
          <span style={{ color: GOLD, fontWeight: 600 }}>睡眠科学</span>
          から生まれた、
          <br />
          新しいスリープウェルネスのかたちです。
        </p>
      </div>
    </div>
  );
}
