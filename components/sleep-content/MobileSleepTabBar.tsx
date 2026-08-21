"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FOCUS_RING } from "@/components/ui/tokens";

const ACTIVE = "#F5F2EA";
const INACTIVE = "rgba(245, 242, 234, 0.72)";
const FROST_BG = "rgba(16, 28, 54, 0.62)";
const FROST_BORDER = "rgba(198, 168, 106, 0.38)";
const FROST_SHADOW = "0 8px 28px rgba(10, 18, 36, 0.28)";
const FROST_FILTER = "blur(16px) saturate(1.3)";

const TABS = [
  {
    label: "ホーム",
    href: "/",
    match: (pathname: string) => pathname === "/",
    icon: HomeIcon,
  },
  {
    label: "語りかけ",
    href: "/sleep/talk",
    match: (pathname: string) =>
      pathname === "/sleep/talk" || pathname.startsWith("/sleep/talk/"),
    icon: TalkIcon,
  },
  {
    label: "入眠音",
    href: "/sleep/sound",
    match: (pathname: string) =>
      pathname === "/sleep/sound" || pathname.startsWith("/sleep/sound/"),
    icon: SoundIcon,
  },
  {
    label: "睡眠学",
    href: "/sleep/science",
    match: (pathname: string) =>
      pathname === "/sleep/science" || pathname.startsWith("/sleep/science/"),
    icon: ScienceIcon,
  },
] as const;

function iconProps(active: boolean) {
  return {
    viewBox: "0 0 24 24",
    className: "h-[22px] w-[22px]",
    fill: "none" as const,
    stroke: active ? ACTIVE : INACTIVE,
    strokeWidth: active ? "2" : "1.75",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 11.2L12 4.5l8 6.7" />
      <path d="M6.2 10.5V19h11.6v-8.5" />
      <path d="M10 19v-5.2h4V19" />
    </svg>
  );
}

function TalkIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M7 9h10M7 13h6" />
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 3V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function SoundIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 10v4" />
      <path d="M8 7v10" />
      <path d="M12 4v16" />
      <path d="M16 8v8" />
      <path d="M20 11v2" />
    </svg>
  );
}

function ScienceIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 1 4 16.5V5.5z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

/**
 * モバイル向け浮遊カプセル型タブバー（ホーム含む 4 タブ）。
 * トップを含む全ページで表示。デスクトップ（lg+ / 1024px以上）では非表示。
 * ホームイントロ中は非表示し、完了後にフェードインする。
 */
export default function MobileSleepTabBar() {
  const pathname = usePathname() || "/";
  const [visible, setVisible] = useState(pathname !== "/");

  useEffect(() => {
    const html = document.documentElement;
    const sync = () => {
      setVisible(!html.classList.contains("swij-intro-active"));
    };
    const frame = window.requestAnimationFrame(sync);
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <nav
      aria-label="主要ナビゲーション"
      data-sleep-tabbar=""
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(0.875rem,env(safe-area-inset-bottom,0px))] md:px-6 lg:hidden ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div
        className={`mx-auto flex w-full max-w-md items-stretch justify-between gap-0.5 rounded-full border border-white/50 px-1.5 py-1.5 shadow-[0_8px_32px_-8px_rgba(7,20,38,0.22)] backdrop-blur-xl backdrop-saturate-150 ${
          visible ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{
          background: FROST_BG,
          borderColor: FROST_BORDER,
          backdropFilter: FROST_FILTER,
          WebkitBackdropFilter: FROST_FILTER,
          boxShadow: FROST_SHADOW,
        }}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition duration-200 active:opacity-90 ${FOCUS_RING}`}
              style={{
                backgroundColor: active
                  ? "rgba(255, 255, 255, 0.12)"
                  : "transparent",
              }}
              aria-current={active ? "page" : undefined}
            >
              <Icon active={active} />
              <span
                className="whitespace-nowrap text-[10px] font-semibold leading-none tracking-[-0.02em]"
                style={{ color: active ? ACTIVE : INACTIVE }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
