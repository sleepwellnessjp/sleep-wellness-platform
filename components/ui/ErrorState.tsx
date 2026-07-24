import Button from "./Button";
import { CARD_CLASS, DANGER, NAVY } from "./tokens";

export type ErrorKind =
  | "network"
  | "supabase"
  | "ai"
  | "timeout"
  | "generic";

const KIND_COPY: Record<
  ErrorKind,
  { eyebrow: string; defaultTitle: string }
> = {
  network: {
    eyebrow: "CONNECTION",
    defaultTitle: "通信に失敗しました",
  },
  supabase: {
    eyebrow: "DATABASE",
    defaultTitle: "データの取得に失敗しました",
  },
  ai: {
    eyebrow: "AI",
    defaultTitle: "AIの生成に失敗しました",
  },
  timeout: {
    eyebrow: "TIMEOUT",
    defaultTitle: "タイムアウトしました",
  },
  generic: {
    eyebrow: "ERROR",
    defaultTitle: "読み込みに失敗しました",
  },
};

function classifyError(message: string | null | undefined): ErrorKind {
  if (!message) return "generic";
  const lower = message.toLowerCase();
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    message.includes("タイムアウト")
  ) {
    return "timeout";
  }
  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    message.includes("通信")
  ) {
    return "network";
  }
  if (
    lower.includes("supabase") ||
    lower.includes("postgres") ||
    lower.includes("rls") ||
    message.includes("データベース")
  ) {
    return "supabase";
  }
  if (
    lower.includes("openai") ||
    lower.includes("gpt") ||
    message.includes("AI")
  ) {
    return "ai";
  }
  return "generic";
}

type Props = {
  title?: string;
  message?: string | null;
  kind?: ErrorKind;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
};

export default function ErrorState({
  title,
  message,
  kind,
  onRetry,
  retryLabel = "再試行",
  compact = false,
}: Props) {
  const resolvedKind = kind ?? classifyError(message);
  const copy = KIND_COPY[resolvedKind];

  return (
    <div
      className={`${CARD_CLASS} border-rose-200/80 bg-rose-50/70 text-center ${
        compact ? "px-4 py-6" : "px-6 py-10 sm:px-8"
      }`}
      role="alert"
    >
      <p
        className="text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: DANGER }}
      >
        {copy.eyebrow}
      </p>
      <h3
        className={`font-semibold tracking-[-0.03em] ${
          compact ? "mt-2 text-[15px]" : "mt-3 text-lg"
        }`}
        style={{ color: NAVY }}
      >
        {title ?? copy.defaultTitle}
      </h3>
      {message ? (
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-rose-700/90 sm:text-[14px] sm:leading-7">
          {message}
        </p>
      ) : null}
      {onRetry ? (
        <div className="mt-5 flex justify-center">
          <Button
            onClick={onRetry}
            size={compact ? "sm" : "md"}
            className="w-full sm:w-auto"
          >
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export { classifyError };
