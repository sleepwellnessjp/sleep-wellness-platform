"use client";

import {
  computeRecoveryIndex,
  RECOVERY_INDEX_COMPOSITION_LABEL,
  type RecoveryIndexResult,
} from "@/lib/recovery-index";
import { GOLD, NAVY } from "@/components/ui/tokens";

type Props = {
  hrv?: string | number | null;
  restingHeartRate?: string | number | null;
  /** 事前計算結果があれば再利用 */
  value?: RecoveryIndexResult;
  className?: string;
  /** PDF印刷レイアウト向けに余白を詰める */
  compact?: boolean;
};

function UnavailableCard({
  message,
  className,
  compact,
}: {
  message: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`report-recovery-index rounded-xl border border-[#071426]/10 bg-[#fafaf8] ${
        compact ? "px-4 py-3.5" : "px-4 py-4 sm:px-5 sm:py-5"
      } ${className ?? ""}`}
      aria-label="回復指数"
    >
      <p
        className="text-[10px] font-semibold tracking-[0.14em] sm:tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        RECOVERY INDEX
      </p>
      <h3
        className="mt-1.5 text-[1.05rem] font-semibold tracking-[-0.03em] sm:text-[1.15rem]"
        style={{ color: NAVY }}
      >
        回復指数（Recovery Index）
      </h3>
      <p className="mt-3 text-[13px] leading-6 text-slate-500 sm:text-[14px]">
        {message}
      </p>
      <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
        HRVと安静時心拍数が揃っている場合に算出します。
      </p>
    </section>
  );
}

export default function RecoveryIndexCard({
  hrv,
  restingHeartRate,
  value,
  className,
  compact = false,
}: Props) {
  const recovery =
    value ??
    computeRecoveryIndex({
      hrv,
      restingHeartRate,
    });

  if (!recovery.available) {
    return (
      <UnavailableCard
        message={recovery.message}
        className={className}
        compact={compact}
      />
    );
  }

  return (
    <section
      className={`report-recovery-index rounded-xl border px-4 py-4 sm:px-5 sm:py-5 ${
        compact ? "py-3.5" : ""
      } ${className ?? ""}`}
      style={{
        borderColor: `${recovery.accent}33`,
        background: `linear-gradient(145deg, ${recovery.accentSoft} 0%, #ffffff 42%, #fafaf8 100%)`,
      }}
      aria-label={`回復指数 ${recovery.score}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-semibold tracking-[0.14em] sm:tracking-[0.18em]"
            style={{ color: GOLD }}
          >
            RECOVERY INDEX
          </p>
          <h3
            className="mt-1.5 text-[1.05rem] font-semibold tracking-[-0.03em] sm:text-[1.15rem]"
            style={{ color: NAVY }}
          >
            回復指数（Recovery Index）
          </h3>
          <p
            className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold sm:text-[14px]"
            style={{
              color: recovery.accent,
              backgroundColor: recovery.accentSoft,
            }}
          >
            <span aria-hidden>{recovery.emoji}</span>
            {recovery.label}
          </p>
          <p
            className="mt-3 text-[13px] leading-6 sm:text-[14px] sm:leading-7"
            style={{ color: "rgba(7,20,38,0.72)" }}
          >
            {recovery.summary}
          </p>
        </div>

        <div className="shrink-0 text-left sm:min-w-[6.5rem] sm:text-right">
          <p
            className="text-[2.35rem] font-semibold leading-none tracking-[-0.06em] sm:text-[2.85rem]"
            style={{ color: NAVY }}
          >
            {recovery.score}
          </p>
          <p className="mt-1 text-[11px] tracking-[0.12em] text-slate-400">
            / 100
          </p>
          <p className="mt-2 max-w-[11rem] text-[10px] leading-4 text-slate-400 sm:ml-auto sm:text-[11px]">
            {recovery.compositionLabel ?? RECOVERY_INDEX_COMPOSITION_LABEL}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-[#071426]/08 pt-3.5 sm:mt-5 sm:pt-4">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
          なぜこの判定なのか
        </p>
        <ul className="mt-2 space-y-1.5">
          {recovery.why.map((line) => (
            <li
              key={line}
              className="text-[13px] leading-6 sm:text-[14px] sm:leading-7"
              style={{ color: "rgba(7,20,38,0.75)" }}
            >
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-5 sm:grid-cols-2">
        {(
          [
            ["運動", recovery.advice.exercise],
            ["睡眠", recovery.advice.sleep],
            ["食事", recovery.advice.nutrition],
            ["ストレス管理", recovery.advice.stress],
          ] as const
        ).map(([title, body]) => (
          <div
            key={title}
            className="rounded-lg border border-[#071426]/08 bg-white/80 px-3 py-2.5"
          >
            <p
              className="text-[10px] font-semibold tracking-[0.12em]"
              style={{ color: GOLD }}
            >
              {title}
            </p>
            <p
              className="mt-1 text-[12px] leading-5 sm:text-[13px] sm:leading-6"
              style={{ color: "rgba(7,20,38,0.72)" }}
            >
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
