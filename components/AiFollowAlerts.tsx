"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { AiFollowAlert } from "@/lib/ai-follow-alerts";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GOLD_MID = "#b89242";
const GOLD_LIGHT = "#d8b36a";
const GOLD_SOFT = "rgba(184, 146, 66, 0.12)";
const GOLD_BORDER = "rgba(138, 106, 45, 0.28)";

function AttentionMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 3.8 21.2 20.2H2.8L12 3.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.2v5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.1" r="0.95" fill="currentColor" />
    </svg>
  );
}

export type AiFollowAlertItem = AiFollowAlert & {
  href?: string;
  clientLabel?: string;
};

type Props = {
  alerts: AiFollowAlertItem[];
  /** コンパクト表示（結果ページ向け） */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
  eyebrow?: string;
  description?: string;
  /** 指定時はアラート0件でもセクションを表示 */
  emptyMessage?: string;
  /** ヘッダー下に区切り線（ダッシュボード向け） */
  dividedHeader?: boolean;
};

function AlertBody({
  alert,
}: {
  alert: AiFollowAlertItem;
}) {
  return (
    <>
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: GOLD_SOFT, color: GOLD_MID }}
        aria-hidden
      >
        <AttentionMark className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        {alert.clientLabel ? (
          <p
            className="text-[12px] font-semibold tracking-[-0.01em]"
            style={{ color: GOLD }}
          >
            {alert.clientLabel}
          </p>
        ) : null}
        <p
          className={`break-words text-[14px] font-semibold tracking-[-0.02em] sm:text-[15px] ${
            alert.clientLabel ? "mt-0.5" : ""
          }`}
          style={{ color: NAVY }}
        >
          {alert.title}
        </p>
        <p className="mt-1 break-words text-[12px] leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
          {alert.detail}
        </p>
      </div>
    </>
  );
}

/**
 * AIアラート（フォロー推奨）。診断表現は使わず、ゴールドの注意マークで提示。
 */
export default function AiFollowAlerts({
  alerts,
  compact = false,
  className = "",
  style,
  title = "フォロー推奨",
  eyebrow = "AI ALERT · FOLLOW UP",
  description = "診断ではありません。認定講師の次回フォローの着眼点です。",
  emptyMessage,
  dividedHeader = false,
}: Props) {
  if (alerts.length === 0 && emptyMessage == null) return null;

  const itemClassName =
    "flex min-h-14 min-w-0 gap-3 rounded-[18px] border bg-white/75 px-3.5 py-3.5 backdrop-blur-sm sm:min-h-0 sm:px-5 sm:py-4";
  const linkedItemClassName = `${itemClassName} transition active:bg-white sm:hover:bg-white sm:active:bg-white/75`;
  const itemStyle = {
    borderColor: "rgba(138, 106, 45, 0.18)",
    boxShadow: "0 10px 30px -28px rgba(138,106,45,0.45)",
  } as const;

  let list: ReactNode = null;
  if (alerts.length === 0) {
    list = (
      <p className="relative py-6 text-center text-sm leading-7 text-slate-400">
        {emptyMessage}
      </p>
    );
  } else {
    list = (
      <ul
        className={`relative ${compact ? "mt-4 space-y-2.5" : "mt-5 space-y-3"}`}
      >
        {alerts.map((alert) => (
          <li key={alert.id}>
            {alert.href ? (
              <Link
                href={alert.href}
                className={linkedItemClassName}
                style={itemStyle}
              >
                <AlertBody alert={alert} />
              </Link>
            ) : (
              <div className={itemClassName} style={itemStyle}>
                <AlertBody alert={alert} />
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border px-4 py-5 sm:px-7 sm:py-7 ${className}`}
      style={{
        borderColor: GOLD_BORDER,
        background:
          "linear-gradient(155deg, rgba(250,247,241,0.98) 0%, #ffffff 42%, rgba(245,239,228,0.92) 100%)",
        boxShadow: "0 24px 70px -52px rgba(138,106,45,0.55)",
        ...style,
      }}
      aria-label={title}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${GOLD_LIGHT}, transparent)`,
        }}
      />
      <div
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full opacity-50"
        style={{
          background: `radial-gradient(circle, rgba(216,179,106,0.32), transparent 70%)`,
        }}
      />

      <div
        className={`relative flex flex-wrap items-start justify-between gap-3 ${
          dividedHeader ? "mb-5 border-b pb-4" : ""
        }`}
        style={
          dividedHeader ? { borderColor: "rgba(138, 106, 45, 0.14)" } : undefined
        }
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: GOLD_SOFT,
              color: GOLD_MID,
              boxShadow: `inset 0 0 0 1px ${GOLD_BORDER}`,
            }}
          >
            <AttentionMark className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p
              className="text-[10px] font-semibold tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              {eyebrow}
            </p>
            <h2
              className={`mt-1 font-semibold tracking-[-0.03em] ${
                compact ? "text-[15px] sm:text-base" : "text-lg sm:text-xl"
              }`}
              style={{ color: NAVY }}
            >
              {title}
            </h2>
            <p className="mt-1.5 max-w-xl text-[12px] leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
              {description}
            </p>
          </div>
        </div>
        <p
          className="rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.14em]"
          style={{
            color: GOLD,
            backgroundColor: GOLD_SOFT,
            boxShadow: `inset 0 0 0 1px ${GOLD_BORDER}`,
          }}
        >
          {alerts.length}件
        </p>
      </div>

      {list}
    </section>
  );
}
