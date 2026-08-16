"use client";

import { usePathname } from "next/navigation";
import Loading from "@/design-system/Loading";

/** HomeIntro と同じ地色。トップの待ち時間に白画面を出さない */
const INTRO_BG = "#020b1a";

/** Route-level loading — calm SWIJ spinner (v2.3). */
export default function RootLoading() {
  const pathname = usePathname() || "/";

  if (pathname === "/") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: INTRO_BG,
        }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[color:var(--sw-surface)] px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loading label="読み込み中" size="lg" />
    </div>
  );
}
