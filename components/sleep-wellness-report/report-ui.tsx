import type { ReactNode } from "react";
import { GOLD, NAVY } from "@/components/ui/tokens";

export function SwrEyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-[0.22em]"
      style={{ color: GOLD }}
    >
      {children}
    </p>
  );
}

export function SwrCard({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "hero" | "warm" | "teal" | "memo";
}) {
  const toneClass =
    tone === "hero"
      ? "border-[color:rgba(138,106,45,0.2)] bg-white"
      : tone === "warm"
        ? "border-[color:rgba(7,20,38,0.06)] bg-white"
        : tone === "teal"
          ? "border-[color:rgba(7,20,38,0.06)] bg-white"
          : tone === "memo"
            ? "border-[color:rgba(7,20,38,0.08)] bg-[#fafafa]"
            : "border-[color:rgba(7,20,38,0.06)] bg-white";
  return (
    <section
      className={`swr-card swr-print-avoid overflow-hidden rounded-[24px] border p-6 shadow-[0_1px_2px_rgba(7,20,38,0.03)] sm:p-8 ${toneClass} ${className}`}
    >
      {children}
    </section>
  );
}

export function SwrTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      className="mt-2 text-[1.25rem] font-semibold tracking-[-0.03em] sm:text-[1.35rem]"
      style={{ color: NAVY }}
    >
      {children}
    </h2>
  );
}

export const DEVICE_LABEL: Record<string, string> = {
  soxai: "SOXAI",
  oura: "Oura Ring",
  apple_watch: "Apple Watch",
  garmin: "Garmin",
  fitbit: "Fitbit",
  other: "Wearable",
  manual: "手動入力",
};

export function formatDeviceName(device: string): string {
  return DEVICE_LABEL[device] ?? device;
}

export function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}
