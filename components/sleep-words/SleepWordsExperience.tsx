"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import SiteHeader from "@/components/site/SiteHeader";
import { FOCUS_RING, GOLD, NAVY } from "@/components/ui/tokens";
import {
  SLEEP_WORD_QUOTES,
  type SleepWordQuote,
} from "@/lib/sleep-words/quotes";
import { HOME_TOP_HREF } from "@/lib/home-intro";

type ShareKind = "instagram" | "x" | null;

const SERIF =
  '"Hiragino Mincho ProN", "Hiragino Mincho Pro", "Yu Mincho", "YuMincho", "Noto Serif JP", serif';

/** 青海波（ごく薄い背景用） */
const SEIGAIHA_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60">
    <g fill="none" stroke="#071426" stroke-width="1.2">
      <path d="M0 30 A30 30 0 0 1 60 30 A30 30 0 0 1 120 30" />
      <path d="M0 60 A30 30 0 0 1 60 60 A30 30 0 0 1 120 60" />
      <path d="M-60 0 A30 30 0 0 1 0 0 A30 30 0 0 1 60 0 A30 30 0 0 1 120 0 A30 30 0 0 1 180 0" />
    </g>
  </svg>`,
);

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <radialGradient id="swIgGrad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#swIgGrad)" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="17.2" cy="6.8" r="1.15" fill="#fff" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.68 10.49 20.1 3h-1.52l-5.57 6.5L8.56 3H3.5l6.73 9.82L3.5 21h1.52l5.89-6.87L15.44 21h5.06l-6.82-10.51Zm-2.08 2.43-.68-.98L5.57 4.5h2.34l4.38 6.28.68.98 5.56 7.97h-2.34l-4.59-6.81Z" />
    </svg>
  );
}

function buildShareText(quote: SleepWordQuote): string {
  return `「${quote.text}」\n— ${quote.author}\n\nSleep Wellness Institute Japan\n#睡眠のための言葉 #間のヨガ`;
}

function buildXIntentUrl(quote: SleepWordQuote): string {
  const text = buildShareText(quote);
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

async function shareOrDownloadQuoteImage(quote: SleepWordQuote): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const canvas = document.createElement("canvas");
    const w = 1080;
    const h = 1920;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "failed";

    // 生成り〜ネイビーの静かな背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#f4efe6");
    grad.addColorStop(0.55, "#ebe4d8");
    grad.addColorStop(1, "#071426");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 薄い青海波風の弧（簡易）
    ctx.strokeStyle = "rgba(7,20,38,0.06)";
    ctx.lineWidth = 2;
    for (let row = 0; row < 18; row++) {
      const y = 80 + row * 70;
      for (let col = 0; col < 10; col++) {
        const x = (row % 2 === 0 ? 0 : 60) + col * 120;
        ctx.beginPath();
        ctx.arc(x, y, 48, Math.PI, 0);
        ctx.stroke();
      }
    }

    // ゴールドの細いライン
    ctx.strokeStyle = "rgba(184,146,66,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.28);
    ctx.lineTo(w * 0.72, h * 0.28);
    ctx.stroke();

    ctx.fillStyle = "rgba(138,106,45,0.9)";
    ctx.font = '500 28px "Hiragino Sans", "Helvetica Neue", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("睡眠のための言葉", w / 2, h * 0.24);

    // 格言（折り返し）
    ctx.fillStyle = "#071426";
    ctx.font = `500 54px ${SERIF}`;
    const maxWidth = w * 0.72;
    const lines: string[] = [];
    let current = "";
    for (const ch of quote.text) {
      const next = current + ch;
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = ch;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);

    const lineHeight = 78;
    const startY = h * 0.42 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, startY + i * lineHeight);
    });

    ctx.fillStyle = "rgba(7,20,38,0.62)";
    ctx.font = '400 32px "Hiragino Sans", "Helvetica Neue", sans-serif';
    ctx.fillText(quote.author, w / 2, startY + lines.length * lineHeight + 70);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = '400 26px "Hiragino Sans", "Helvetica Neue", sans-serif';
    ctx.fillText("Sleep Wellness Institute Japan", w / 2, h * 0.88);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) return "failed";

    const file = new File([blob], "sleep-words.png", { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };

    if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await nav.share({
          files: [file],
          title: "睡眠のための言葉",
          text: buildShareText(quote),
        });
        return "shared";
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return "failed";
      }
    }

    // フォールバック: 画像を保存
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sleep-words.png";
    a.click();
    URL.revokeObjectURL(url);
    return "downloaded";
  } catch {
    return "failed";
  }
}

export default function SleepWordsExperience() {
  const [quote, setQuote] = useState<SleepWordQuote | null>(
    SLEEP_WORD_QUOTES[0] ?? null,
  );
  const [shareKind, setShareKind] = useState<ShareKind>(null);
  const [igNote, setIgNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 訪問ごとに1つだけ表示（配列からランダム選択。切り替えUIは出さない）
    if (SLEEP_WORD_QUOTES.length === 0) return;
    const i = Math.floor(Math.random() * SLEEP_WORD_QUOTES.length);
    setQuote(SLEEP_WORD_QUOTES[i] ?? SLEEP_WORD_QUOTES[0]);
  }, []);

  const closeModal = useCallback(() => {
    setShareKind(null);
    setIgNote(null);
  }, []);

  useEffect(() => {
    if (!shareKind) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [shareKind, closeModal]);

  const onInstagramStory = useMemo(
    () => async () => {
      if (!quote) return;
      setBusy(true);
      const result = await shareOrDownloadQuoteImage(quote);
      setBusy(false);
      if (result === "shared") {
        setIgNote("共有シートが開きました。Instagram を選んでストーリーに追加できます。");
      } else if (result === "downloaded") {
        setIgNote(
          "画像を保存しました。Instagram アプリを開き、保存した画像からストーリーを作成してください。",
        );
      } else {
        setIgNote(
          "このブラウザでは自動共有できません。画面をスクリーンショットして、Instagram ストーリーへお使いください。",
        );
      }
    },
    [quote],
  );

  if (!quote) return null;

  return (
    <main className="sw-words-root relative min-h-[100dvh] overflow-hidden text-[#071426]">
      <style>{`
        .sw-words-root {
          background:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(216,179,106,0.12), transparent 55%),
            linear-gradient(180deg, #f7f3ea 0%, #f3eee4 42%, #eef2f4 100%);
        }
        .sw-words-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.045;
          background-image: url("data:image/svg+xml;utf8,${SEIGAIHA_SVG}");
          background-size: 120px 60px;
        }
        .sw-words-quote {
          font-family: ${SERIF};
        }
      `}</style>

      <div className="sw-words-pattern" aria-hidden />

      {/* スマホ専用トップバー */}
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:hidden">
        <Link
          href={HOME_TOP_HREF}
          className={`inline-flex w-fit min-h-11 items-center rounded-full px-3 text-[12px] font-semibold transition hover:bg-[rgba(7,20,38,0.04)] ${FOCUS_RING}`}
          style={{ color: GOLD }}
        >
          ← トップページへ戻る
        </Link>
        <SiteNavMenu />
      </div>

      <div className="relative z-20 hidden sm:block">
        <SiteHeader
          actions={
            <Link
              href="/contact"
              className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold text-white transition hover:opacity-90 sm:text-sm"
              style={{ background: NAVY }}
            >
              お問い合わせ
            </Link>
          }
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-lg flex-col px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.75rem)] pt-6 sm:min-h-[calc(100vh-6rem)] sm:max-w-xl sm:px-8 sm:pb-16 sm:pt-12">
        <header className="text-center">
          <p
            className="text-[10px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            間の書
          </p>
          <h1
            className="mt-2 text-[1.05rem] font-semibold tracking-[-0.02em] sm:text-lg"
            style={{ color: NAVY }}
          >
            睡眠のための言葉
          </h1>
          <div
            className="mx-auto mt-5 h-px w-16"
            style={{ background: "rgba(184,146,66,0.55)" }}
            aria-hidden
          />
        </header>

        <section className="relative mt-10 flex flex-1 flex-col items-center justify-center sm:mt-14">
          {/* 淡い円 */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[min(78vw,340px)] w-[min(78vw,340px)] -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ borderColor: "rgba(184,146,66,0.18)" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[min(92vw,400px)] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ borderColor: "rgba(7,20,38,0.04)" }}
            aria-hidden
          />

          <blockquote className="relative z-10 max-w-[20rem] text-center sm:max-w-md">
            <p
              className="sw-words-quote text-[1.35rem] leading-[1.85] tracking-[0.04em] sm:text-[1.65rem] sm:leading-[1.9]"
              style={{ color: NAVY }}
            >
              {quote.text}
            </p>
            <div
              className="mx-auto mt-7 h-px w-12"
              style={{ background: "rgba(184,146,66,0.45)" }}
              aria-hidden
            />
            <footer className="mt-5 text-[13px] tracking-[0.08em] text-[rgba(7,20,38,0.55)] sm:text-sm">
              {quote.author}
            </footer>
          </blockquote>
        </section>

        <section className="mt-10 rounded-[28px] border border-[rgba(7,20,38,0.06)] bg-white/75 px-5 py-6 text-center shadow-[0_12px_40px_-28px_rgba(7,20,38,0.25)] backdrop-blur-sm sm:mt-12 sm:px-8 sm:py-7">
          <p
            className="text-[13px] font-semibold tracking-[0.12em]"
            style={{ color: NAVY }}
          >
            シェア
          </p>
          <p className="mt-1 text-[11px] text-[rgba(7,20,38,0.45)]">
            この言葉をシェアする
          </p>
          <div className="mt-5 flex items-start justify-center gap-10">
            <button
              type="button"
              onClick={() => {
                setIgNote(null);
                setShareKind("instagram");
              }}
              className={`flex flex-col items-center gap-2 ${FOCUS_RING} rounded-2xl p-1`}
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(7,20,38,0.08)] ring-1 ring-[rgba(7,20,38,0.06)]">
                <InstagramIcon className="h-8 w-8" />
              </span>
              <span className="text-[11px] text-[rgba(7,20,38,0.55)]">
                Instagram
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShareKind("x")}
              className={`flex flex-col items-center gap-2 ${FOCUS_RING} rounded-2xl p-1`}
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(7,20,38,0.08)] ring-1 ring-[rgba(7,20,38,0.06)]">
                <XIcon className="h-5 w-5 text-[#071426]" />
              </span>
              <span className="text-[11px] text-[rgba(7,20,38,0.55)]">X</span>
            </button>
          </div>
        </section>
      </div>

      {shareKind ? (
        <div
          className="fixed inset-0 z-[280] flex items-center justify-center px-5"
          role="presentation"
        >
          <button
            type="button"
            aria-label="シェア案内を閉じる"
            className="absolute inset-0 bg-[#071426]/45"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sleep-words-share-title"
            className="relative z-10 w-full max-w-sm rounded-[24px] bg-white px-6 py-7 shadow-[0_24px_60px_-20px_rgba(7,20,38,0.35)] sm:px-8 sm:py-8"
          >
            {shareKind === "instagram" ? (
              <>
                <h2
                  id="sleep-words-share-title"
                  className="text-center text-[17px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  準備ができました
                </h2>
                <div className="mt-5 space-y-4 text-center text-[13px] leading-7 text-[rgba(7,20,38,0.72)]">
                  <p>
                    もし宜しければ、
                    <br />
                    Sleep Wellness Institute Japan をタグ付けして
                    <br />
                    ご投稿ください。
                  </p>
                  <p>
                    誰もが心の余白を
                    <br />
                    大切にできる世界になると素敵ですね。
                  </p>
                </div>
                {igNote ? (
                  <p
                    className="mt-5 rounded-2xl border px-4 py-3 text-left text-[12px] leading-6"
                    style={{
                      borderColor: "rgba(184,146,66,0.3)",
                      background: "rgba(216,179,106,0.1)",
                      color: NAVY,
                    }}
                  >
                    {igNote}
                  </p>
                ) : null}
                <div className="mt-6 border-t border-[rgba(7,20,38,0.08)] pt-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onInstagramStory}
                    className={`inline-flex min-h-11 w-full items-center justify-center text-[15px] font-semibold transition hover:opacity-80 disabled:opacity-60 ${FOCUS_RING} rounded-lg`}
                    style={{ color: GOLD }}
                  >
                    {busy ? "準備中…" : "ストーリーの編集へ"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2
                  id="sleep-words-share-title"
                  className="text-center text-[17px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  X に投稿する準備
                </h2>
                <div className="mt-5 space-y-4 text-center text-[13px] leading-7 text-[rgba(7,20,38,0.72)]">
                  <p>
                    格言・著者名・Sleep Wellness Institute Japan
                    を含んだ投稿文を用意しました。
                  </p>
                  <p
                    className="rounded-2xl border bg-[#f7f7f5] px-4 py-4 text-left text-[12px] leading-6"
                    style={{ borderColor: "rgba(7,20,38,0.08)", color: NAVY }}
                  >
                    {buildShareText(quote)
                      .split("\n")
                      .map((line) => (
                        <span key={line} className="block">
                          {line || "\u00A0"}
                        </span>
                      ))}
                  </p>
                </div>
                <div className="mt-6 border-t border-[rgba(7,20,38,0.08)] pt-4">
                  <a
                    href={buildXIntentUrl(quote)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-11 w-full items-center justify-center text-[15px] font-semibold transition hover:opacity-80 ${FOCUS_RING} rounded-lg`}
                    style={{ color: GOLD }}
                    onClick={closeModal}
                  >
                    投稿画面を開く
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
