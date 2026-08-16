import Image from "next/image";
import Link from "next/link";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { HOME_TOP_HREF } from "@/lib/home-intro";

export default function InstructorPublicShell({
  children,
  title,
  titleHref = "/instructors",
}: {
  children: React.ReactNode;
  title?: string;
  titleHref?: string;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#071426]">
      <header className="border-b border-[#071426]/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] sm:gap-4 sm:px-6 sm:py-4 sm:pt-4 lg:px-8">
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
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-2 sm:flex sm:gap-3">
              <Link
                href={titleHref}
                className="rounded-full px-3 py-2 text-xs font-semibold text-[#071426]/80 transition hover:bg-[#071426]/04 sm:text-sm"
              >
                {title ?? "認定講師一覧"}
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-white px-4 text-xs font-semibold text-[#8a6a2d] transition hover:border-[#8a6a2d]/55 hover:bg-[#fafaf8] sm:text-sm"
              >
                講師ログイン
              </Link>
            </nav>
            <SiteNavMenu />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
