import Link from "next/link";
import { FOCUS_RING, GOLD_LIGHT } from "@/components/ui/tokens";
import {
  MELATONIN_YOGA_HOME_APPLY_BANNERS,
  type MelatoninYogaHomeApplyBannerItem,
} from "@/lib/melatonin-yoga/home-banner-copy";

function ApplyBannerCard({ copy }: { copy: MelatoninYogaHomeApplyBannerItem }) {
  return (
    <article
      className="overflow-hidden rounded-[22px] border sm:rounded-[24px]"
      style={{
        borderColor: "rgba(216,179,106,0.35)",
        boxShadow:
          "inset 0 1px 0 rgba(216,179,106,0.1), 0 20px 50px -40px rgba(0,0,0,0.45)",
        background:
          "linear-gradient(180deg, rgba(12,30,55,0.98) 0%, rgba(7,20,38,0.96) 100%)",
      }}
    >
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <p
          className="text-[10px] font-semibold tracking-[0.26em] sm:text-[11px] sm:tracking-[0.28em]"
          style={{ color: GOLD_LIGHT }}
        >
          {copy.eyebrow}
        </p>

        <h3 className="mt-2 text-[18px] font-semibold leading-snug tracking-[-0.03em] text-white sm:mt-2.5 sm:text-xl">
          {copy.title}
        </h3>

        <ul
          className="mt-4 space-y-2 rounded-2xl border border-[#d8b36a]/20 bg-white/[0.04] px-4 py-3.5 sm:mt-5 sm:px-5 sm:py-4"
          aria-label={copy.highlightsAriaLabel}
        >
          {copy.highlights.map((line) => (
            <li
              key={line}
              className="border-l-2 border-[#d8b36a]/70 pl-3 text-[13px] font-semibold leading-6 text-white sm:text-sm sm:leading-7"
            >
              {line}
            </li>
          ))}
        </ul>

        {copy.description ? (
          <p className="mt-4 text-[12px] leading-5 text-white/65 sm:mt-5 sm:text-[13px] sm:leading-6">
            {copy.description}
          </p>
        ) : null}

        <Link
          href={copy.ctaHref}
          className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-[#071426] transition duration-300 hover:-translate-y-0.5 hover:opacity-95 sm:mt-6 sm:text-base ${FOCUS_RING}`}
          style={{
            background: `linear-gradient(145deg, ${GOLD_LIGHT}, #8a6a2d)`,
            boxShadow: "0 10px 28px -12px rgba(216,179,106,0.55)",
          }}
        >
          {copy.ctaLabel}
        </Link>
      </div>
    </article>
  );
}

export default function MelatoninYogaHomeApplyBanner() {
  return (
    <div
      className="mt-4 space-y-4 sm:mt-5 sm:space-y-5 lg:mt-6"
      aria-label="メラトニンヨガ™ お申し込み案内"
    >
      {MELATONIN_YOGA_HOME_APPLY_BANNERS.map((copy) => (
        <ApplyBannerCard key={copy.id} copy={copy} />
      ))}
    </div>
  );
}
