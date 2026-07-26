import Image from "next/image";
import Link from "next/link";

export default function InstructorPublicShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#071426]">
      <header className="border-b border-[#071426]/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={180}
              height={44}
              className="h-auto w-[140px] sm:w-[160px]"
              priority
            />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/instructors"
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
        </div>
      </header>
      {children}
    </div>
  );
}
