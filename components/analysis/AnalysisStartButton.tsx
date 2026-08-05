"use client";

type AnalysisStartButtonProps = {
  disabled: boolean;
  busy?: boolean;
  label: string;
  busyLabel?: string;
  hint?: string;
};

/**
 * フォーム submit 用ボタン。disabled 時は必須画像不足などを示す。
 * type="submit" のため親 form の onSubmit を維持する。
 */
export default function AnalysisStartButton({
  disabled,
  busy = false,
  label,
  busyLabel = "処理中...",
  hint,
}: AnalysisStartButtonProps) {
  return (
    <div>
      {hint ? (
        <p className="mb-4 text-[13px] leading-6 text-white/65">{hint}</p>
      ) : null}
      <button
        type="submit"
        disabled={disabled || busy}
        className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-[#071426] shadow-[0_18px_50px_-20px_rgba(255,255,255,0.55)] transition duration-500 active:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-12 sm:py-5 sm:text-lg sm:hover:-translate-y-1 sm:hover:bg-[#f4f4f4] sm:active:translate-y-0 disabled:sm:hover:translate-y-0"
      >
        {busy ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#071426]/20 border-t-[#071426]" />
            {busyLabel}
          </>
        ) : (
          <>
            {label}
            <span className="transition-transform duration-500 group-hover:translate-x-1">
              →
            </span>
          </>
        )}
      </button>
    </div>
  );
}
