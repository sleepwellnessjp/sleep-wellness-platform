import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { NAVY } from "@/components/ui/tokens";
import { HOME_TOP_HREF } from "@/lib/home-intro";

type SiteHeaderProps = {
  /** 右側に並べる既存ナビ（PC向け）。スマホでは非表示にしてハンバーガーを優先 */
  actions?: ReactNode;
  /** ロゴ下の補助ラベルなど */
  eyebrow?: string;
  className?: string;
  maxWidthClassName?: string;
  tone?: "dark" | "light";
};

/**
 * 公開ページ向け共通ヘッダー。
 * ロゴ構成を維持しつつ、右上にハンバーガーメニューを置く。
 * スマホのみ safe-area を考慮して下げる（PC位置は変更しない）。
 */
export default function SiteHeader({
  actions,
  eyebrow,
  className = "",
  maxWidthClassName = "max-w-7xl",
  tone = "dark",
}: SiteHeaderProps) {
  return (
    <header
      className={`border-b border-[rgba(7,20,38,0.08)] bg-white/90 backdrop-blur-md ${className}`}
    >
      <div
        className={`mx-auto flex items-center justify-between gap-3 px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] sm:gap-4 sm:px-8 sm:py-4 sm:pt-4 lg:px-10 ${maxWidthClassName}`}
      >
        <Link
          href={HOME_TOP_HREF}
          className="inline-flex min-h-11 min-w-11 items-center gap-3 py-1.5 pr-2 sm:min-h-0 sm:py-0 sm:pr-0"
        >
          <Image
            src="/swij-logo-horizontal.png"
            alt="Sleep Wellness Institute Japan"
            width={180}
            height={44}
            className="h-auto w-[140px] sm:w-[160px]"
            priority
          />
          {eyebrow ? (
            <span
              className="hidden text-[10px] font-semibold tracking-[0.2em] sm:inline"
              style={{ color: NAVY }}
            >
              {eyebrow}
            </span>
          ) : null}
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {actions ? (
            <div className="hidden items-center gap-2 sm:flex sm:gap-3">
              {actions}
            </div>
          ) : null}
          <SiteNavMenu tone={tone} />
        </div>
      </div>
    </header>
  );
}
