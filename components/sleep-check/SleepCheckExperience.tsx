"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { FOCUS_RING } from "@/components/ui/tokens";
import {
  resultForScore,
  SLEEP_CHECK_IMAGES,
  SLEEP_CHECK_MEDICAL_LIST_URL,
  SLEEP_CHECK_PREAMBLE,
  SLEEP_CHECK_QUESTIONS,
} from "@/lib/sleep-check/content";

const TEXT = "#F5F2EA";
const GOLD = "#B8945F";
const FROST_BG = "rgba(16, 28, 54, 0.62)";
const FROST_BORDER = "rgba(184, 148, 95, 0.38)";
const FROST_FILTER = "blur(16px) saturate(1.3)";

/** 麻の葉（ごく薄い背景用） */
const ASANOHA_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="84" viewBox="0 0 72 84">
    <g fill="none" stroke="${GOLD}" stroke-width="1.1">
      <path d="M36 6 L62 21 V51 L36 66 L10 51 V21 Z"/>
      <path d="M36 6 V66 M10 21 L62 51 M62 21 L10 51"/>
    </g>
  </svg>`,
);

type Screen = "intro" | "question" | "result";

function FrostButton({
  children,
  className = "",
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const merged: CSSProperties = {
    color: TEXT,
    background: FROST_BG,
    borderColor: FROST_BORDER,
    backdropFilter: FROST_FILTER,
    WebkitBackdropFilter: FROST_FILTER,
    ...style,
  };
  return (
    <button
      {...props}
      className={`rounded-full border px-5 py-3.5 text-left text-[15px] leading-snug transition active:scale-[0.99] ${FOCUS_RING} ${className}`}
      style={merged}
    >
      {children}
    </button>
  );
}

function FrostLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className={`inline-flex min-h-12 flex-1 items-center justify-center rounded-full border px-4 py-3 text-center text-[13px] font-semibold leading-snug sm:text-sm ${FOCUS_RING}`}
      style={{
        color: TEXT,
        background: FROST_BG,
        borderColor: FROST_BORDER,
        backdropFilter: FROST_FILTER,
        WebkitBackdropFilter: FROST_FILTER,
      }}
    >
      {children}
    </Link>
  );
}

function NekoSpeech({
  src,
  message,
  size = 132,
}: {
  src: string;
  message: string;
  size?: number;
}) {
  return (
    <div className="flex items-end gap-3">
      <Image
        src={src}
        alt="まもりねこ"
        width={size}
        height={size}
        className="h-auto w-[min(38vw,9rem)] shrink-0 object-contain"
      />
      <div
        className="relative mb-6 max-w-[16rem] rounded-[22px] px-4 py-3 text-[14px] leading-relaxed"
        style={{
          color: TEXT,
          background: "rgba(245, 242, 234, 0.1)",
          border: `1px solid ${FROST_BORDER}`,
        }}
      >
        <span
          aria-hidden
          className="absolute -left-1.5 bottom-5 h-3 w-3 rotate-45"
          style={{
            background: "rgba(245, 242, 234, 0.1)",
            borderLeft: `1px solid ${FROST_BORDER}`,
            borderBottom: `1px solid ${FROST_BORDER}`,
          }}
        />
        {message}
      </div>
    </div>
  );
}

export default function SleepCheckExperience() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => SLEEP_CHECK_QUESTIONS.map(() => null),
  );
  const [pending, setPending] = useState(false);

  const question = SLEEP_CHECK_QUESTIONS[index];
  const total = SLEEP_CHECK_QUESTIONS.length;

  const reset = useCallback(() => {
    setScreen("intro");
    setIndex(0);
    setAnswers(SLEEP_CHECK_QUESTIONS.map(() => null));
    setPending(false);
  }, []);

  const goBack = () => {
    if (pending) return;
    if (index === 0) {
      setScreen("intro");
      return;
    }
    setIndex((prev) => prev - 1);
  };

  const pick = (score: number) => {
    if (pending || !question) return;
    const nextAnswers = [...answers];
    nextAnswers[index] = score;
    setAnswers(nextAnswers);
    setPending(true);
    window.setTimeout(() => {
      if (index >= total - 1) {
        setScreen("result");
      } else {
        setIndex((prev) => prev + 1);
      }
      setPending(false);
    }, 180);
  };

  const score = answers.reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const result = resultForScore(score);

  return (
    <main
      className="sw-check-root relative min-h-[100dvh] overflow-x-hidden"
      style={{ color: TEXT }}
    >
      <style>{`
        .sw-check-root {
          background-color: #0A1426;
        }
        .sw-check-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.07;
          background-image: url("data:image/svg+xml;utf8,${ASANOHA_SVG}");
          background-size: 72px 84px;
        }
      `}</style>
      <div className="sw-check-pattern" aria-hidden />

      <div className="relative z-20 flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <Link
          href="/"
          className={`inline-flex min-h-11 items-center rounded-full px-3 text-[12px] font-semibold ${FOCUS_RING}`}
          style={{ color: GOLD }}
        >
          ← ホーム
        </Link>
        <SiteNavMenu tone="light" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-lg flex-col px-5 pb-[var(--sw-sleep-page-bottom-pad)] pt-4 sm:max-w-xl sm:px-8 sm:pb-16">
        {screen === "intro" ? (
          <section className="flex flex-1 flex-col">
            <p
              className="text-[10px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              SLEEP CHECK
            </p>
            <h1 className="mt-4 text-[1.7rem] font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">
              あなたの眠り、いまどんな感じ？
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-[#F5F2EA]/78 sm:text-base sm:leading-8">
              8つの質問に答えると、いまの眠りの状態が見えてきます。1分ほどで終わります。
            </p>

            <div className="mt-8 flex flex-1 flex-col justify-center">
              <NekoSpeech
                src={SLEEP_CHECK_IMAGES.tsujo}
                message="いっしょに見ていこうね"
                size={180}
              />
            </div>

            <p className="mt-6 text-[11px] leading-5 text-[#F5F2EA]/48">
              これは医学的な診断ではありません。気づきのきっかけとしてお使いください。
            </p>

            <button
              type="button"
              onClick={() => setScreen("question")}
              className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold text-[#0A1426] transition active:scale-[0.99] ${FOCUS_RING}`}
              style={{ background: GOLD }}
            >
              はじめる
            </button>
          </section>
        ) : null}

        {screen === "question" && question ? (
          <section className="flex flex-1 flex-col">
            <p className="text-[12px] tabular-nums" style={{ color: GOLD }}>
              {index + 1} / {total}
            </p>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full"
              style={{ background: "rgba(245, 242, 234, 0.12)" }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={index + 1}
              aria-label="進捗"
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${((index + 1) / total) * 100}%`,
                  background: GOLD,
                }}
              />
            </div>

            <p className="mt-5 text-[12px] leading-5 text-[#F5F2EA]/58">
              {SLEEP_CHECK_PREAMBLE}
            </p>

            <h2 className="mt-4 text-[1.15rem] font-semibold leading-snug tracking-[-0.02em] sm:text-xl">
              {question.title}
            </h2>

            <div className="mt-5 flex flex-col gap-2.5">
              {question.options.map((option) => {
                const selected = answers[index] === option.score;
                return (
                  <FrostButton
                    key={option.score}
                    type="button"
                    disabled={pending}
                    onClick={() => pick(option.score)}
                    className="min-h-12 w-full"
                    style={{
                      color: TEXT,
                      background: selected
                        ? "rgba(184, 148, 95, 0.22)"
                        : FROST_BG,
                      borderColor: selected ? GOLD : FROST_BORDER,
                      backdropFilter: FROST_FILTER,
                      WebkitBackdropFilter: FROST_FILTER,
                    }}
                  >
                    {option.label}
                  </FrostButton>
                );
              })}
            </div>

            <div className="mt-8">
              <NekoSpeech src={question.nekoSrc} message={question.speech} />
            </div>

            <button
              type="button"
              onClick={goBack}
              className={`mt-6 self-start text-[13px] font-semibold ${FOCUS_RING}`}
              style={{ color: GOLD }}
            >
              ひとつ前に戻る
            </button>
          </section>
        ) : null}

        {screen === "result" ? (
          <section className="flex flex-1 flex-col">
            <p
              className="text-[10px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              RESULT
            </p>
            <div className="mt-6 flex justify-center">
              <Image
                src={result.nekoSrc}
                alt="まもりねこ"
                width={220}
                height={220}
                className="h-auto w-[min(52vw,13rem)] object-contain"
              />
            </div>
            <h2 className="mt-5 text-center text-[1.55rem] font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">
              {result.heading}
            </h2>
            <p
              className="mx-auto mt-5 max-w-md rounded-[22px] px-4 py-4 text-[15px] leading-7 sm:leading-8"
              style={{
                background: "rgba(245, 242, 234, 0.1)",
                border: `1px solid ${FROST_BORDER}`,
              }}
            >
              {result.message}
            </p>
            <p className="mt-4 text-center text-[11px] text-[#F5F2EA]/40">
              参考：{score}点
            </p>

            <button
              type="button"
              onClick={reset}
              className={`mt-5 self-center text-[13px] font-semibold ${FOCUS_RING}`}
              style={{ color: GOLD }}
            >
              もう一度やってみる
            </button>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <FrostLink href="/instructors">
                認定講師を探してみない？
              </FrostLink>
              <FrostLink href="/contact">SWIJに相談してみない？</FrostLink>
              {result.showMedical ? (
                <FrostLink href={SLEEP_CHECK_MEDICAL_LIST_URL} external>
                  医療機関で相談してみない？
                </FrostLink>
              ) : null}
            </div>
            {result.showMedical ? (
              <p className="mt-3 text-[11px] leading-5 text-[#F5F2EA]/48">
                睡眠時無呼吸症候群など、医療で対応できるものもあります。一覧は日本睡眠学会の睡眠医療認定ページです。
              </p>
            ) : null}

            <p className="mt-8 text-[11px] leading-5 text-[#F5F2EA]/40">
              これは医学的な診断ではありません。気づきのきっかけとしてお使いください。
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
