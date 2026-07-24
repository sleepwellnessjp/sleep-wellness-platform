"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { GOLD, MUTED, NAVY, SURFACE } from "@/components/ui/tokens";
import { clearDemoSession } from "@/lib/auth/demo-session";
import { useRouter } from "next/navigation";

export default function DemoShell({
  children,
  eyebrow = "DEMO MODE",
  title,
  subtitle,
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();

  const handleExit = () => {
    clearDemoSession();
    router.push("/login");
  };

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: SURFACE, color: NAVY }}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-4">
          <Link href="/demo" className="flex min-h-11 items-center gap-3">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={160}
              height={40}
              className="h-auto w-[120px] sm:w-[140px]"
              priority
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className="hidden rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.18em] sm:inline"
              style={{ color: GOLD, borderColor: "rgba(138,106,45,0.35)" }}
            >
              DEMO
            </span>
            <button
              type="button"
              onClick={handleExit}
              className="inline-flex min-h-11 items-center justify-center rounded-full px-3 text-[13px] font-medium transition active:opacity-70 sm:min-h-0 sm:px-4 sm:hover:underline"
              style={{ color: MUTED }}
            >
              終了
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-14 sm:pb-14">
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          {eyebrow}
        </p>
        {title ? (
          <h1
            className="mt-2 break-words text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p
            className="mt-3 max-w-xl text-[14px] leading-7 sm:text-[15px]"
            style={{ color: MUTED }}
          >
            {subtitle}
          </p>
        ) : null}
        <div className={title || subtitle ? "mt-8 sm:mt-10" : "mt-2"}>
          {children}
        </div>
      </div>
    </main>
  );
}
