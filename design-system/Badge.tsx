import type { ReactNode } from "react";
import { DANGER, GOLD, NAVY, SUCCESS, TEAL } from "./tokens";

type Tone = "neutral" | "navy" | "gold" | "teal" | "success" | "danger" | "planned";

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

const TONE: Record<Tone, { bg: string; color: string; border: string }> = {
  neutral: {
    bg: "rgba(15,23,42,0.04)",
    color: "#475569",
    border: "rgba(15,23,42,0.08)",
  },
  navy: {
    bg: "rgba(7,20,38,0.06)",
    color: NAVY,
    border: "rgba(7,20,38,0.12)",
  },
  gold: {
    bg: "rgba(138,106,45,0.08)",
    color: GOLD,
    border: "rgba(138,106,45,0.2)",
  },
  teal: {
    bg: "rgba(49,95,104,0.08)",
    color: TEAL,
    border: "rgba(49,95,104,0.2)",
  },
  success: {
    bg: "rgba(15,107,92,0.08)",
    color: SUCCESS,
    border: "rgba(15,107,92,0.2)",
  },
  danger: {
    bg: "rgba(163,58,58,0.08)",
    color: DANGER,
    border: "rgba(163,58,58,0.2)",
  },
  planned: {
    bg: "rgba(138,106,45,0.06)",
    color: GOLD,
    border: "rgba(138,106,45,0.18)",
  },
};

export default function Badge({
  children,
  tone = "neutral",
  className = "",
}: Props) {
  const style = TONE[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.16em] ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.color,
        borderColor: style.border,
      }}
    >
      {children}
    </span>
  );
}
