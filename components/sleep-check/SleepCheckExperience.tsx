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
import SleepCheckAboutAccordion from "@/components/sleep-check/SleepCheckAboutAccordion";
import { FOCUS_RING } from "@/components/ui/tokens";
import {
  resultForScore,
  SLEEP_CHECK_IMAGES,
  SLEEP_CHECK_MEDICAL_LIST_URL,
  SLEEP_CHECK_PREAMBLE,
  SLEEP_CHECK_QUESTIONS,
} from "@/lib/sleep-check/content";
import {
  calcDaytimeScore,
  DAYTIME_PREAMBLE,
  DAYTIME_QUESTIONS,
} from "@/lib/sleep-check/daytime";
import {
  CHRONOTYPE_PREAMBLE,
  CHRONOTYPE_QUESTIONS,
  judgeChronotype,
} from "@/lib/sleep-check/chronotype";
import {
  AXIS_COMMENTS,
  judgeThreeAxis,
  PRIORITY_MESSAGES,
  type AxisLevel,
} from "@/lib/sleep-check/verdict";

const BG = "#F5F0E4";
const TEXT = "#0A1426";
const MUTED = "#5A6B7D";
const GOLD = "#B8945F";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#E0D8C6";
const CUSHION = "rgba(224, 216, 198, 0.55)";
const CARD_SHADOW =
  "0 24px 56px rgba(10, 20, 38, 0.11), 0 8px 20px rgba(10, 20, 38, 0.05)";

/** 麻の葉（記事カバーと同じタイル定義） */
const ASANOHA_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="84" viewBox="0 0 72 84">
    <g fill="none" stroke="${GOLD}" stroke-width="1.1">
      <path d="M36 6 L62 21 V51 L36 66 L10 51 V21 Z"/>
      <path d="M36 6 V66 M10 21 L62 51 M62 21 L10 51"/>
    </g>
  </svg>`,
);

type Screen =
  | "intro"
  | "question"
  | "result"
  | "extended-intro"
  | "extended-question"
  | "extended-result";

type ExtendedSection = "daytime" | "chronotype";
type ExtendedScore = 0 | 1 | 2 | 3 | 4 | null;
type ExtendedOption = {
  label: string;
  score: ExtendedScore;
};
type ExtendedQuestion = {
  id: number;
  title: string;
  speech: string;
  nekoSrc: string;
  preamble: string;
  section: ExtendedSection;
  options: ExtendedOption[];
};

const AXIS_SEGMENT_COLORS = [
  "rgba(184, 148, 95, 0.25)",
  "rgba(184, 148, 95, 0.45)",
  "rgba(184, 148, 95, 0.70)",
  "rgba(184, 148, 95, 1)",
] as const;

function axisLevelToStep(level: AxisLevel | "none" | "moderate" | "severe"): number {
  if (level === "none") return 1;
  if (level === "mild") return 2;
  if (level === "moderate") return 3;
  return 4;
}

function axisLabel(level: AxisLevel | "none" | "moderate" | "severe"): string {
  if (level === "none") return "安定";
  if (level === "mild") return "軽度";
  if (level === "moderate") return "中等度";
  return "強め";
}

function AxisBar({
  title,
  level,
}: {
  title: string;
  level: AxisLevel | "none" | "moderate" | "severe";
}) {
  const step = axisLevelToStep(level);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px] font-semibold">
        <span>{title}</span>
        <span style={{ color: MUTED }}>{axisLabel(level)}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {AXIS_SEGMENT_COLORS.map((color, idx) => (
          <div
            key={`${title}-${idx}`}
            className="h-2 rounded-full"
            style={{
              background:
                idx < step
                  ? color
                  : "rgba(184, 148, 95, 0.10)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SpeechBubbleDown({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-[20px] border px-4 py-2.5 text-center text-[14px] leading-relaxed ${className}`}
      style={{
        color: TEXT,
        background: CARD_BG,
        borderColor: CARD_BORDER,
      }}
    >
      {message}
      <span
        aria-hidden
        className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rotate-45"
        style={{
          background: CARD_BG,
          borderRight: `1px solid ${CARD_BORDER}`,
          borderBottom: `1px solid ${CARD_BORDER}`,
        }}
      />
    </div>
  );
}

function NekoWithCushion({
  src,
  widthClass,
  imageWidth,
}: {
  src: string;
  widthClass: string;
  imageWidth: number;
}) {
  return (
    <div
      className={`relative flex aspect-square flex-col items-center overflow-visible ${widthClass}`}
    >
      <div
        className="absolute bottom-[6%] left-1/2 h-[12%] min-h-[10px] w-[78%] -translate-x-1/2 rounded-[50%]"
        style={{ background: CUSHION }}
        aria-hidden
      />
      <Image
        src={src}
        alt="まもりねこ"
        width={imageWidth}
        height={imageWidth}
        priority
        className="relative z-[1] h-full w-full"
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}

function NekoHero({
  src,
  message,
}: {
  src: string;
  message: string;
}) {
  return (
    <div className="flex w-full flex-col items-center">
      <SpeechBubbleDown
        message={message}
        className="mb-4 max-w-[15rem] sm:max-w-[17rem]"
      />
      <NekoWithCushion
        src={src}
        widthClass="w-[min(50vw,12.5rem)] sm:w-[min(42vw,13.5rem)]"
        imageWidth={216}
      />
    </div>
  );
}

function SpeechBubbleSide({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-[22px] border px-5 py-4 text-[22px] font-medium leading-snug ${className}`}
      style={{
        color: TEXT,
        background: CARD_BG,
        borderColor: CARD_BORDER,
      }}
    >
      {message}
      <span
        aria-hidden
        className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45"
        style={{
          background: CARD_BG,
          borderLeft: `1px solid ${CARD_BORDER}`,
          borderBottom: `1px solid ${CARD_BORDER}`,
        }}
      />
    </div>
  );
}

function NekoCompact({
  src,
  message,
}: {
  src: string;
  message: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <NekoWithCushion
        src={src}
        widthClass="w-[120px] shrink-0"
        imageWidth={120}
      />
      <SpeechBubbleSide message={message} className="min-w-0 flex-1" />
    </div>
  );
}

function OptionButton({
  children,
  className = "",
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const merged: CSSProperties = {
    color: TEXT,
    background: CARD_BG,
    borderColor: CARD_BORDER,
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

function GoldPillLink({
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
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 py-3.5 text-center text-[14px] font-semibold leading-snug text-white transition active:scale-[0.99] sm:text-[15px] ${FOCUS_RING}`}
      style={{ background: GOLD }}
    >
      {children}
    </Link>
  );
}

function GoldOutlinePillLink({
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
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 px-5 py-3.5 text-center text-[14px] font-semibold leading-snug transition active:scale-[0.99] sm:text-[15px] ${FOCUS_RING}`}
      style={{
        color: GOLD,
        borderColor: GOLD,
        background: "transparent",
      }}
    >
      {children}
    </Link>
  );
}

function ResultCard({
  nekoSrc,
  heading,
  message,
  score,
}: {
  nekoSrc: string;
  heading: string;
  message: string;
  score: number;
}) {
  return (
    <div
      className="rounded-[24px] px-6 pb-7 pt-6 sm:px-8 sm:pb-8 sm:pt-7"
      style={{
        background: CARD_BG,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        className="mx-auto mb-6 h-0.5 w-[120px] rounded-full"
        style={{ background: GOLD }}
        aria-hidden
      />
      <div className="flex justify-center">
        <NekoWithCushion
          src={nekoSrc}
          widthClass="w-[min(44vw,10.5rem)]"
          imageWidth={168}
        />
      </div>
      <h2 className="mt-5 text-center text-[1.65rem] font-semibold leading-tight tracking-[-0.03em] sm:text-[1.85rem]">
        {heading}
      </h2>
      <p className="mt-4 text-center text-[15px] leading-7 sm:text-base sm:leading-8">
        {message}
      </p>
      <p
        className="mt-5 text-center text-[11px] tabular-nums"
        style={{ color: MUTED }}
      >
        参考：{score}点
      </p>
    </div>
  );
}

export default function SleepCheckExperience() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => SLEEP_CHECK_QUESTIONS.map(() => null),
  );
  const [extendedIndex, setExtendedIndex] = useState(0);
  const [daytimeAnswers, setDaytimeAnswers] = useState<Array<0 | 1 | 2 | 3 | null>>(
    () => DAYTIME_QUESTIONS.map(() => null),
  );
  const [chronotypeAnswers, setChronotypeAnswers] = useState<Array<1 | 2 | 3 | 4 | null>>(
    () => CHRONOTYPE_QUESTIONS.map(() => null),
  );
  const [pending, setPending] = useState(false);

  const question = SLEEP_CHECK_QUESTIONS[index];
  const total = SLEEP_CHECK_QUESTIONS.length;
  const extendedQuestions: ExtendedQuestion[] = [
    ...DAYTIME_QUESTIONS.map((q) => ({
      ...q,
      section: "daytime" as const,
      preamble: DAYTIME_PREAMBLE,
      options: q.options as ExtendedOption[],
    })),
    ...CHRONOTYPE_QUESTIONS.map((q) => ({
      ...q,
      section: "chronotype" as const,
      preamble: CHRONOTYPE_PREAMBLE,
      options: q.options as ExtendedOption[],
    })),
  ];
  const extendedTotal = extendedQuestions.length;
  const extendedQuestion = extendedQuestions[extendedIndex];

  const reset = useCallback(() => {
    setScreen("intro");
    setIndex(0);
    setAnswers(SLEEP_CHECK_QUESTIONS.map(() => null));
    setExtendedIndex(0);
    setDaytimeAnswers(DAYTIME_QUESTIONS.map(() => null));
    setChronotypeAnswers(CHRONOTYPE_QUESTIONS.map(() => null));
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

  const goBackExtended = () => {
    if (pending) return;
    if (extendedIndex === 0) {
      setScreen("extended-intro");
      return;
    }
    setExtendedIndex((prev) => prev - 1);
  };

  const pickExtended = (score: ExtendedScore) => {
    if (pending || !extendedQuestion) return;

    if (extendedQuestion.section === "daytime") {
      const localIndex = extendedIndex;
      const next = [...daytimeAnswers];
      next[localIndex] = score as 0 | 1 | 2 | 3 | null;
      setDaytimeAnswers(next);
    } else {
      const localIndex = extendedIndex - DAYTIME_QUESTIONS.length;
      const next = [...chronotypeAnswers];
      next[localIndex] = score as 1 | 2 | 3 | 4;
      setChronotypeAnswers(next);
    }

    setPending(true);
    window.setTimeout(() => {
      if (extendedIndex >= extendedTotal - 1) {
        setScreen("extended-result");
      } else {
        setExtendedIndex((prev) => prev + 1);
      }
      setPending(false);
    }, 180);
  };

  const score = answers.reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const result = resultForScore(score);
  const daytimeScore = calcDaytimeScore(daytimeAnswers);
  const chronotypeFilled = chronotypeAnswers.map((value) => value ?? 1) as Array<
    1 | 2 | 3 | 4
  >;
  const chronotype = judgeChronotype(chronotypeFilled);
  const threeAxis = judgeThreeAxis({
    insomniaScore: score,
    daytimeScore,
    chronotype,
  });
  const priorityMessage = PRIORITY_MESSAGES[threeAxis.priority];
  const priorityAxis: "insomnia" | "daytime" | "rhythm" | null =
    threeAxis.priority.startsWith("insomnia")
      ? "insomnia"
      : threeAxis.priority.startsWith("daytime")
        ? "daytime"
        : threeAxis.priority === "rhythm"
          ? "rhythm"
          : null;
  const secondaryAxes = (["insomnia", "daytime", "rhythm"] as const)
    .filter((axis) => axis !== priorityAxis)
    .slice(0, 2);

  return (
    <main
      className="sw-check-root relative min-h-[100dvh] overflow-x-hidden"
      style={{ color: TEXT }}
    >
      <style>{`
        .sw-check-root {
          background-color: ${BG};
        }
        .sw-check-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.1;
          background-image: url("data:image/svg+xml;utf8,${ASANOHA_SVG}");
          background-size: 72px 84px;
        }
      `}</style>
      <div className="sw-check-pattern" aria-hidden />

      <div className="relative z-20 flex items-center justify-between px-4 pb-1 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <Link
          href="/"
          className={`inline-flex min-h-11 items-center rounded-full px-3 text-[12px] font-semibold ${FOCUS_RING}`}
          style={{ color: MUTED }}
        >
          ← ホーム
        </Link>
        <SiteNavMenu tone="dark" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col px-5 pb-[var(--sw-sleep-page-bottom-pad)] pt-2 sm:max-w-xl sm:px-8 sm:pb-16">
        {screen === "intro" ? (
          <section className="flex flex-1 flex-col items-center text-center">
            <p
              className="text-[10px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              SLEEP CHECK
            </p>

            <div className="mt-6 flex w-full flex-1 flex-col items-center justify-center py-4 sm:mt-8 sm:py-6">
              <NekoHero
                src={SLEEP_CHECK_IMAGES.tsujo}
                message="いっしょに見ていこうね"
              />
            </div>

            <h1 className="text-[1.75rem] font-semibold leading-[1.25] tracking-[-0.03em] sm:text-[2rem]">
              あなたの眠り、
              <br className="sm:hidden" />
              いまどんな感じ？
            </h1>
            <p
              className="mt-3 max-w-sm text-[14px] leading-7 sm:text-[15px] sm:leading-8"
              style={{ color: MUTED }}
            >
              8つの質問で、いまの眠りの状態が見えてきます。
              <br className="hidden sm:inline" />
              1分ほどで終わります。
            </p>

            <button
              type="button"
              onClick={() => setScreen("question")}
              className={`mt-6 inline-flex min-h-[3.25rem] w-full max-w-md items-center justify-center rounded-full text-[15px] font-semibold text-white transition active:scale-[0.99] sm:mt-7 ${FOCUS_RING}`}
              style={{ background: GOLD }}
            >
              はじめる
            </button>

            <p
              className="mt-4 max-w-sm text-[10px] leading-5 sm:text-[11px]"
              style={{ color: MUTED }}
            >
              これは医学的な診断ではありません。
              <br />
              気づきのきっかけとしてお使いください。
            </p>

            <div
              className="mt-8 h-px w-16"
              style={{ background: CARD_BORDER }}
              aria-hidden
            />

            <SleepCheckAboutAccordion />
          </section>
        ) : null}

        {screen === "question" && question ? (
          <section className="flex flex-1 flex-col">
            <p
              className="text-[11px] font-semibold tabular-nums tracking-[0.08em]"
              style={{ color: GOLD }}
            >
              {index + 1} / {total}
            </p>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full"
              style={{ background: CARD_BORDER }}
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

            <NekoCompact src={question.nekoSrc} message={question.speech} />

            <p
              className="mt-5 text-[11px] leading-5"
              style={{ color: MUTED }}
            >
              {SLEEP_CHECK_PREAMBLE}
            </p>

            <h2 className="mt-3 text-[1.2rem] font-semibold leading-snug tracking-[-0.02em] sm:text-[1.35rem]">
              {question.title}
            </h2>

            <div className="mt-5 flex flex-col gap-2.5">
              {question.options.map((option) => {
                const selected = answers[index] === option.score;
                return (
                  <OptionButton
                    key={option.score}
                    type="button"
                    disabled={pending}
                    onClick={() => pick(option.score)}
                    className="min-h-12 w-full"
                    style={{
                      background: selected
                        ? "rgba(184, 148, 95, 0.12)"
                        : CARD_BG,
                      borderColor: selected ? GOLD : CARD_BORDER,
                    }}
                  >
                    {option.label}
                  </OptionButton>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goBack}
              className={`mt-8 self-start text-[13px] font-semibold ${FOCUS_RING}`}
              style={{ color: GOLD }}
            >
              ひとつ前に戻る
            </button>
          </section>
        ) : null}

        {screen === "result" ? (
          <section className="flex flex-1 flex-col">
            <p
              className="text-center text-[10px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              RESULT
            </p>

            <div className="mt-5 sm:mt-6">
              <ResultCard
                nekoSrc={result.nekoSrc}
                heading={result.heading}
                message={result.message}
                score={score}
              />
            </div>

            <p
              className="mt-8 text-center text-[11px] font-semibold tracking-[0.12em]"
              style={{ color: GOLD }}
            >
              つぎの一歩に
            </p>

            <div className="mt-3 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setExtendedIndex(0);
                  setScreen("extended-intro");
                }}
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-full border px-5 py-3.5 text-center text-[14px] font-semibold leading-snug transition active:scale-[0.99] sm:text-[15px] ${FOCUS_RING}`}
                style={{ color: GOLD, borderColor: GOLD, background: CARD_BG }}
              >
                さらに詳しく調べる
              </button>
              <GoldPillLink href="/instructors">
                認定講師を探してみない？
              </GoldPillLink>
              <GoldPillLink href="/contact">SWIJに相談してみない？</GoldPillLink>
              {result.showMedical ? (
                <>
                  <GoldOutlinePillLink
                    href={SLEEP_CHECK_MEDICAL_LIST_URL}
                    external
                  >
                    医療機関で相談してみない？
                  </GoldOutlinePillLink>
                  <p
                    className="mt-1 text-center text-[10px] leading-5 sm:text-[11px]"
                    style={{ color: MUTED }}
                  >
                    睡眠時無呼吸症候群など、医療で対応できるものもあります。
                  </p>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={reset}
              className={`mt-8 self-center text-[13px] font-medium ${FOCUS_RING}`}
              style={{ color: MUTED }}
            >
              もう一度やってみる
            </button>

            <p
              className="mt-6 text-center text-[10px] leading-5"
              style={{ color: MUTED }}
            >
              これは医学的な診断ではありません。気づきのきっかけとしてお使いください。
            </p>
          </section>
        ) : null}

        {screen === "extended-intro" ? (
          <section className="flex flex-1 flex-col items-center text-center">
            <p
              className="text-[10px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              EXTENDED CHECK
            </p>

            <div className="mt-6 flex w-full flex-1 flex-col items-center justify-center py-4 sm:mt-8 sm:py-6">
              <NekoHero
                src={SLEEP_CHECK_IMAGES.ouen}
                message="もう少しだけ一緒に見てみよう"
              />
            </div>

            <h1 className="text-[1.6rem] font-semibold leading-[1.3] tracking-[-0.03em] sm:text-[1.9rem]">
              さらに詳しく、
              <br className="sm:hidden" />
              眠りを見てみよう
            </h1>
            <p
              className="mt-3 max-w-sm text-[14px] leading-7 sm:text-[15px] sm:leading-8"
              style={{ color: MUTED }}
            >
              あと16問、日中の眠気とからだのリズムについて伺います。
              <br className="hidden sm:inline" />
              2分ほどで終わります。
            </p>

            <button
              type="button"
              onClick={() => setScreen("extended-question")}
              className={`mt-6 inline-flex min-h-[3.25rem] w-full max-w-md items-center justify-center rounded-full text-[15px] font-semibold text-white transition active:scale-[0.99] sm:mt-7 ${FOCUS_RING}`}
              style={{ background: GOLD }}
            >
              はじめる
            </button>

            <button
              type="button"
              onClick={() => setScreen("result")}
              className={`mt-4 text-[13px] font-semibold ${FOCUS_RING}`}
              style={{ color: GOLD }}
            >
              ひとつ前に戻る
            </button>
          </section>
        ) : null}

        {screen === "extended-question" && extendedQuestion ? (
          <section className="flex flex-1 flex-col">
            <p
              className="text-[11px] font-semibold tabular-nums tracking-[0.08em]"
              style={{ color: GOLD }}
            >
              {extendedIndex + 1} / {extendedTotal}
            </p>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full"
              style={{ background: CARD_BORDER }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={extendedTotal}
              aria-valuenow={extendedIndex + 1}
              aria-label="進捗"
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${((extendedIndex + 1) / extendedTotal) * 100}%`,
                  background: GOLD,
                }}
              />
            </div>

            <NekoCompact
              src={extendedQuestion.nekoSrc}
              message={extendedQuestion.speech}
            />

            <p
              className="mt-5 text-[11px] leading-5"
              style={{ color: MUTED }}
            >
              {extendedQuestion.preamble}
            </p>

            <h2 className="mt-3 text-[1.2rem] font-semibold leading-snug tracking-[-0.02em] sm:text-[1.35rem]">
              {extendedQuestion.title}
            </h2>

            <div className="mt-5 flex flex-col gap-2.5">
              {extendedQuestion.options.map((option, optionIdx) => {
                const selected =
                  extendedQuestion.section === "daytime"
                    ? daytimeAnswers[extendedIndex] === option.score
                    : chronotypeAnswers[
                        extendedIndex - DAYTIME_QUESTIONS.length
                      ] === option.score;
                return (
                  <OptionButton
                    key={`${extendedQuestion.id}-${optionIdx}-${option.label}`}
                    type="button"
                    disabled={pending}
                    onClick={() => pickExtended(option.score)}
                    className="min-h-12 w-full"
                    style={{
                      background: selected
                        ? "rgba(184, 148, 95, 0.12)"
                        : CARD_BG,
                      borderColor: selected ? GOLD : CARD_BORDER,
                    }}
                  >
                    {option.label}
                  </OptionButton>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goBackExtended}
              className={`mt-8 self-start text-[13px] font-semibold ${FOCUS_RING}`}
              style={{ color: GOLD }}
            >
              ひとつ前に戻る
            </button>
          </section>
        ) : null}

        {screen === "extended-result" ? (
          <section className="flex flex-1 flex-col">
            <p
              className="text-center text-[10px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              くわしい結果
            </p>

            <div
              className="mt-4 rounded-[20px] border p-4"
              style={{ background: CARD_BG, borderColor: CARD_BORDER }}
            >
              <div className="space-y-4">
                <AxisBar title="眠りの状態（AIS）" level={threeAxis.insomniaLevel} />
                <AxisBar title="日中の眠気" level={threeAxis.daytimeLevel} />
                <AxisBar title="リズムのずれ" level={threeAxis.rhythmLevel} />
              </div>
            </div>

            <div
              className="mt-5 rounded-[24px] px-6 pb-7 pt-6 sm:px-8 sm:pb-8"
              style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
            >
              <p
                className="text-center text-[11px] font-semibold tracking-[0.12em]"
                style={{ color: GOLD }}
              >
                まずここから
              </p>
              <div className="mt-4 flex justify-center">
                <NekoWithCushion
                  src={SLEEP_CHECK_IMAGES.ouen}
                  widthClass="w-[min(44vw,10.5rem)]"
                  imageWidth={168}
                />
              </div>
              <h2 className="mt-4 text-center text-[1.6rem] font-semibold leading-[1.25] tracking-[-0.03em] sm:text-[1.85rem]">
                {priorityMessage.heading}
              </h2>
              <p className="mt-4 text-center text-[15px] leading-7 sm:text-base sm:leading-8">
                {priorityMessage.body}
              </p>
            </div>

            <div
              className="mt-4 rounded-[18px] border px-4 py-3"
              style={{ background: "rgba(255,255,255,0.72)", borderColor: CARD_BORDER }}
            >
              <p className="text-[11px] font-semibold" style={{ color: MUTED }}>
                ほかの軸について
              </p>
              <div className="mt-2 space-y-2 text-[12px] leading-6" style={{ color: MUTED }}>
                {secondaryAxes.map((axis) => {
                  const level =
                    axis === "insomnia"
                      ? threeAxis.insomniaLevel
                      : axis === "daytime"
                        ? threeAxis.daytimeLevel
                        : threeAxis.rhythmLevel;
                  const text =
                    axis === "insomnia"
                      ? AXIS_COMMENTS.insomnia[level as AxisLevel]
                      : axis === "daytime"
                        ? AXIS_COMMENTS.daytime[level as AxisLevel]
                        : AXIS_COMMENTS.rhythm[level as "none" | "moderate" | "severe"];
                  const label =
                    axis === "insomnia"
                      ? "眠りの状態"
                      : axis === "daytime"
                        ? "日中の眠気"
                        : "リズムのずれ";
                  return (
                    <p key={axis}>
                      <span className="font-semibold">{label}：</span>
                      {text}
                    </p>
                  );
                })}
              </div>
            </div>

            <p
              className="mt-8 text-center text-[11px] font-semibold tracking-[0.12em]"
              style={{ color: GOLD }}
            >
              つぎの一歩に
            </p>

            <div className="mt-3 flex flex-col gap-2.5">
              <GoldPillLink href="/instructors">
                認定講師を探してみない？
              </GoldPillLink>
              <GoldPillLink href="/contact">SWIJに相談してみない？</GoldPillLink>
              {threeAxis.showMedical ? (
                <>
                  <GoldOutlinePillLink
                    href={SLEEP_CHECK_MEDICAL_LIST_URL}
                    external
                  >
                    医療機関で相談してみない？
                  </GoldOutlinePillLink>
                  <p
                    className="mt-1 text-center text-[10px] leading-5 sm:text-[11px]"
                    style={{ color: MUTED }}
                  >
                    睡眠時無呼吸症候群など、医療で対応できるものもあります。
                  </p>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={reset}
              className={`mt-8 self-center text-[13px] font-medium ${FOCUS_RING}`}
              style={{ color: MUTED }}
            >
              もう一度やってみる
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
