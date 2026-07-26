import Image from "next/image";
import Link from "next/link";

const navigation = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "認定講師", href: "/instructors" },
  { label: "Partners", href: "#partners" },
  { label: "Founder", href: "#founder" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#071426] text-white">
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-300/5 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-amber-300/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-8 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid gap-12 pb-14 lg:grid-cols-[1fr_1fr_0.9fr] lg:gap-16 lg:pb-16">
          <div>
            <Link
              href="/"
              aria-label="Sleep Wellness Institute Japan"
              className="inline-flex rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-md"
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