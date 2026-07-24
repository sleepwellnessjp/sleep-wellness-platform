import type { ReactNode } from "react";
import Button from "./Button";
import { GOLD, NAVY } from "./tokens";

export type EmptyIllustrationKind =
  | "analysis"
  | "homework"
  | "journey"
  | "score"
  | "history"
  | "generic";

function EmptyIllustration({ kind }: { kind: EmptyIllustrationKind }) {
  const common = {
    viewBox: "0 0 120 96",
    className: "mx-auto h-20 w-auto text-[#8a6a2d]",
    fill: "none",
    "aria-hidden": true as const,
  };

  switch (kind) {
    case "analysis":
      return (
        <svg {...common}>
          <rect
            x="28"
            y="18"
            width="64"
            height="60"
            rx="14"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.35"
          />
          <circle cx="60" cy="44" r="16" stroke="currentColor" strokeWidth="2.2" />
          <path
            d="M60 36v16M52 44h16"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M38 70h44"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
      );
    case "homework":
      return (
        <svg {...common}>
          <rect
            x="34"
            y="16"
            width="52"
            height="64"
            rx="10"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.35"
          />
          <path
            d="M46 36h28M46 48h28M46 60h18"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="84" cy="68" r="14" fill="#f7f7f5" stroke="currentColor" strokeWidth="2" />
          <path
            d="M78 68.5 82.2 72.5 90 64"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "journey":
      return (
        <svg {...common}>
          <path
            d="M22 68c18-28 28-40 38-40s20 12 38 40"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.3"
            strokeLinecap="round"
          />
          <circle cx="30" cy="62" r="4" fill="currentColor" opacity="0.45" />
          <circle cx="60" cy="34" r="5" fill="currentColor" />
          <circle cx="90" cy="62" r="4" fill="currentColor" opacity="0.45" />
          <path
            d="M60 22v6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "score":
      return (
        <svg {...common}>
          <circle
            cx="60"
            cy="48"
            r="28"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.25"
          />
          <path
            d="M60 20a28 28 0 0 1 24.2 14"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <text
            x="60"
            y="54"
            textAnchor="middle"
            fill="currentColor"
            fontSize="18"
            fontWeight="600"
            opacity="0.7"
          >
            —
          </text>
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <rect
            x="26"
            y="22"
            width="68"
            height="14"
            rx="7"
            stroke="currentColor"
            strokeWidth="1.8"
            opacity="0.35"
          />
          <rect
            x="26"
            y="42"
            width="68"
            height="14"
            rx="7"
            stroke="currentColor"
            strokeWidth="1.8"
            opacity="0.5"
          />
          <rect
            x="26"
            y="62"
            width="48"
            height="14"
            rx="7"
            stroke="currentColor"
            strokeWidth="1.8"
            opacity="0.65"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle
            cx="60"
            cy="48"
            r="26"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.3"
          />
          <path
            d="M60 34v18M60 60h.01"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type Props = {
  illustration?: EmptyIllustrationKind;
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  children?: ReactNode;
  compact?: boolean;
};

export default function EmptyState({
  illustration = "generic",
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
  compact = false,
}: Props) {
  return (
    <div
      className={`rounded-[var(--sw-card-radius)] border border-dashed border-[color:var(--sw-gold)]/28 bg-gradient-to-br from-[color:var(--sw-surface-warm)]/80 via-[color:var(--sw-card-bg)] to-[#f5efe4]/40 text-center shadow-[var(--sw-card-shadow)] ${
        compact ? "px-5 py-8" : "px-6 py-10 sm:px-10 sm:py-12"
      }`}
    >
      <EmptyIllustration kind={illustration} />
      {eyebrow ? (
        <p
          className="mt-5 text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h3
        className={`font-semibold tracking-[-0.03em] ${
          compact ? "mt-3 text-base" : "mt-4 text-lg sm:text-xl"
        }`}
        style={{ color: NAVY }}
      >
        {title}
      </h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-7 text-[color:var(--sw-muted)]">
          {description}
        </p>
      ) : null}
      {children}
      {primaryAction || secondaryAction ? (
        <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          {primaryAction ? (
            <Button
              href={primaryAction.href}
              onClick={primaryAction.onClick}
              size="md"
              className="w-full sm:w-auto"
            >
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              variant="secondary"
              href={secondaryAction.href}
              onClick={secondaryAction.onClick}
              size="md"
              className="w-full sm:w-auto"
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
