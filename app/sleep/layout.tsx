import MobileSleepTabBar from "@/components/sleep-content/MobileSleepTabBar";
import type { ReactNode } from "react";

/**
 * /sleep/* 共通：モバイル下部タブバー用の余白を確保する。
 */
export default function SleepLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="pb-[calc(180px+env(safe-area-inset-bottom,0px))] sm:pb-0">
        {children}
      </div>
      <MobileSleepTabBar />
    </>
  );
}
