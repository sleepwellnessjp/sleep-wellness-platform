import type { ReactNode } from "react";

/**
 * /sleep/* 共通レイアウト。
 * モバイルタブバーはルート layout で全ページ表示する。
 */
export default function SleepLayout({ children }: { children: ReactNode }) {
  return children;
}
