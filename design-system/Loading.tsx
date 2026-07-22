import { NAVY } from "./tokens";

type Props = {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-12 w-12 border-4",
} as const;

/**
 * Loading — spinner for inline / page wait states.
 */
export default function Loading({
  label = "読み込み中",
  className = "",
  size = "md",
}: Props) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`animate-spin rounded-full border-slate-200 border-t-transparent ${SIZE[size]}`}
        style={{ borderTopColor: NAVY }}
        aria-hidden
      />
      {label ? (
        <span className="text-xs font-medium tracking-wide text-slate-500">
          {label}
        </span>
      ) : null}
    </div>
  );
}
