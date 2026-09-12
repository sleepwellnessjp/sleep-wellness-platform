import Link from "next/link";
import { GOLD_LIGHT } from "@/components/ui/tokens";

/**
 * トップ → /melatonin-yoga/vision 誘導。
 * Sleep Wellness Method™（About）直前。上下余白は本ブロックのみ（SP80 / PC120）。
 */
export default function HomeVisionPromo() {
  return (
    <section
      aria-label="メラトニンヨガ™が目指すところ"
      className="relative z-10 bg-[#071426] px-6 py-20 text-white sm:px-8 lg:px-10 lg:py-[7.5rem]"
    >
      <Link
        href="/melatonin-yoga/vision"
        className="mx-auto block max-w-3xl transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d8b36a]"
      >
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD_LIGHT }}
        >
          VISION
        </p>
        <p className="mt-5 text-[1.35rem] font-semibold leading-snug tracking-[-0.03em] sm:text-2xl lg:text-[1.75rem]">
          睡眠を文化にする。
          <br />
          その中心に、インストラクターがいる。
        </p>
        <p className="mt-6 text-[14px] font-medium tracking-[0.02em] text-white/75 sm:text-[15px]">
          メラトニンヨガ™が目指すところ →
        </p>
      </Link>
    </section>
  );
}
