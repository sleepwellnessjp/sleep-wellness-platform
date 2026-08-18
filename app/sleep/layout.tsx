import MobileSleepTabBar from "@/components/sleep-content/MobileSleepTabBar";
import type { ReactNode } from "react";

/**
 * /sleep/* 共通：モバイル下部タブバーを配置する。
 * コンテンツへの余白は各ページの PublicIntroLayout に contentClassName で渡す。
 */
export default function SleepLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <MobileSleepTabBar />
    </>
  );
}
