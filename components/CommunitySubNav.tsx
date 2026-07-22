"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { GOLD, NAVY } from "@/components/ui/tokens";

export const COMMUNITY_TABS = [
  { id: "announcements", label: "お知らせ" },
  { id: "discussions", label: "ディスカッション" },
  { id: "cases", label: "ケース共有" },
  { id: "knowledge", label: "ナレッジ" },
  { id: "events", label: "イベント" },
  { id: "messages", label: "メッセージ" },
] as const;

export type CommunityTabId = (typeof COMMUNITY_TABS)[number]["id"];

export function isCommunityTabId(value: string | null): value is CommunityTabId {
  return COMMUNITY_TABS.some((tab) => tab.id === value);
}

export default function CommunitySubNav({ active }: { active: CommunityTabId }) {
  const pathname = usePathname() || "/community";
  const searchParams = useSearchParams();

  return (
    <nav
      aria-label="コミュニティメニュー"
      className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {COMMUNITY_TABS.map((tab) => {
        const isActive = active === tab.id;
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.set("tab", tab.id);
        const href = `${pathname.split("?")[0]}?${params.toString()}`;
        return (
          <Link
            key={tab.id}
            href={href}
            scroll={false}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold tracking-[-0.01em] transition sm:px-4 sm:text-[13px] ${
              isActive
                ? "text-white"
                : "border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-[#071426]"
            }`}
            style={
              isActive
                ? { backgroundColor: NAVY }
                : { borderColor: "rgba(138,106,45,0.18)" }
            }
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
      <span className="sr-only" style={{ color: GOLD }}>
        Community
      </span>
    </nav>
  );
}
