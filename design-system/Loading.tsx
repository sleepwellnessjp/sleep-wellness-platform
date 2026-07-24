import { NAVY } from "./tokens";

type Props = {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-[2.5px]",
  lg: "h-11 w-11 border-[3px]",
} as const;

/**
 * Loading — calm dual-ring spinner for inline / page wait states (v2.3).
 */
export default function Loading({
  label = "読み込み中",
  className = "",
  size = "md",
}: Props) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-3.5 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="relative inline-flex items-center justify-center" aria-hidden>
        <span
          className={`animate-spin rounded-full border-[color:var(--sw-border)] ${SIZE[size]}`}
          style={{ borderTopColor: NAVY }}
        />
        <span
          className="absolute inset-[22%] rounded-full border border-[color:var(--sw-gold)]/35 opacity-70"
          style={{ animation: "analysis-spin-reverse 1.6s linear infinite" }}
        />
      </span>
      {label ? (
        <span className="text-xs font-medium tracking-[0.06em] text-[color:var(--sw-muted)]">
          {label}
        </span>
      ) : (
        <span className="sr-only">読み込み中</span>
      )}
    </div>
  );
}
