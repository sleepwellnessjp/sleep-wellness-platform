import Image from "next/image";
import Link from "next/link";
import { HOME_TOP_HREF } from "@/lib/home-intro";

const navigation = [
  { label: "Sleep Wellness Method™", href: "/#about" },
  { label: "私たちについて", href: "/about" },
  { label: "Services", href: "/#services" },
  { label: "認定講師", href: "/instructors" },
  { label: "認定インストラクターの活動", href: "/instructor-activities" },
  { label: "Evidence", href: "/evidence" },
  { label: "Partners", href: "/#partners" },
  { label: "Founder", href: "/#founder" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#071426] text-white">
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-300/5 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-amber-300/5 blur-3xl" />

      {/* 下部の青海波 — 極薄・全面敷き詰めず、ページ下端にうっすら */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-[0.1] sm:h-48 sm:opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'%3E%3Cpath fill='none' stroke='%23c9a45a' stroke-width='1' d='M0 40c13.3 0 13.3-13.3 26.7-13.3S40 40 53.3 40 66.7 26.7 80 26.7'/%3E%3Cpath fill='none' stroke='%23c9a45a' stroke-width='1' d='M0 26.7c13.3 0 13.3-13.3 26.7-13.3S40 26.7 53.3 26.7 66.7 13.3 80 13.3'/%3E%3Cpath fill='none' stroke='%23c9a45a' stroke-width='1' d='M0 13.3c13.3 0 13.3-13.3 26.7-13.3S40 13.3 53.3 13.3 66.7 0 80 0'/%3E%3C/svg%3E\")",
          backgroundSize: "80px 40px",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "center bottom",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 45%, black 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 45%, black 100%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-8 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid gap-12 pb-14 lg:grid-cols-[1fr_1fr_0.9fr] lg:gap-16 lg:pb-16">
          <div>
            <Link
              href={HOME_TOP_HREF}
              aria-label="Sleep Wellness Institute Japan"
              className="inline-flex rounded-2xl bg-white px-4 py-3"
            >
              <Image
                src="/swij-logo-horizontal.png"
                alt="Sleep Wellness Institute Japan"
                width={360}
                height={90}
                priority
                className="h-auto w-[220px] object-contain sm:w-[260px] lg:w-[300px]"
              />
            </Link>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.30em] text-amber-200">
              BRAND MESSAGE
            </p>

            <h2 className="mt-7 text-3xl font-medium leading-[1.35] tracking-[-0.04em] text-white sm:text-4xl">
              睡眠を、
              <br />
              日本の新しい文化へ。
            </h2>
          </div>

          <nav aria-label="Footer Navigation">
            <p className="text-xs font-semibold tracking-[0.30em] text-slate-500">
              NAVIGATION
            </p>

            <ul className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3 lg:grid-cols-1">
              {navigation.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group inline-flex items-center gap-3 text-sm font-medium text-slate-300 transition duration-300 hover:text-white"
                  >
                    <span className="h-px w-0 bg-amber-200 transition-all duration-300 group-hover:w-5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="h-px w-full bg-white/10" />

        <div className="pt-8">
          <p className="text-xs leading-6 tracking-[0.04em] text-slate-500">
            © 2026 Sleep Wellness Institute Japan.
            <br className="sm:hidden" />
            <span className="sm:ml-1">All Rights Reserved.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}