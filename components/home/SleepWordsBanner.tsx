import Image from "next/image";
import Link from "next/link";

/**
 * Hero「認定講師になる →」直下の横長バナー。
 * Upmind のリスト行構成を参考に、SWIJ のネイビー／ゴールドへ寄せる。
 */
export default function SleepWordsBanner({
  tone = "onDark",
}: {
  tone?: "onDark" | "onNavy";
}) {
  const onDark = tone === "onDark";

  return (
    <Link
      href="/sleep-words"
      aria-label="睡眠のための言葉"
      className={`group mx-auto flex w-full max-w-md items-center gap-3 rounded-[22px] px-3 py-3 text-left transition duration-300 hover:-translate-y-0.5 sm:max-w-lg sm:gap-3.5 sm:rounded-[24px] sm:px-3.5 sm:py-3.5 ${
        onDark
          ? "border border-white/18 bg-white/[0.12] backdrop-blur-md hover:border-[#d8b36a]/45 hover:bg-white/[0.16]"
          : "border border-white/10 bg-white/[0.04] hover:border-[#d8b36a]/35 hover:bg-white/[0.07]"
      }`}
    >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] border border-white/15 bg-[#f7f3ea] sm:h-14 sm:w-14 sm:rounded-2xl">
            <Image
              src="/ma-no-sho-cover.png"
              alt=""
              fill
              className="object-cover object-[center_18%] transition duration-700 group-hover:scale-[1.04]"
              sizes="56px"
            />
          </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[14px] font-semibold tracking-[-0.02em] text-white sm:text-[15px]">
          睡眠のための言葉
        </h2>
        <p className="mt-0.5 truncate text-[11px] leading-4 text-white/60 sm:text-[12px] sm:leading-5">
          心を整える、間のヨガの格言
        </p>
      </div>

      <span
        aria-hidden
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-white/55 transition group-hover:text-[#d8b36a]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 3.5L11 8L6 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}
