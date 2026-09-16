"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearHomeIntroBootBg } from "@/lib/home-intro";

/**
 * layout boot が付けたトップ専用の濃紺初期背景を解除する。
 * - `/` : 初回ペイント後に解除（イントロレイヤーが既に濃紺）
 * - それ以外: すぐ解除（クライアント遷移で残らないようにする）
 */
export default function HomeIntroBootRelease() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (pathname !== "/") {
      clearHomeIntroBootBg();
      return;
    }

    const t0 = window.setTimeout(clearHomeIntroBootBg, 0);
    const t1 = window.setTimeout(clearHomeIntroBootBg, 120);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [pathname]);

  return null;
}
