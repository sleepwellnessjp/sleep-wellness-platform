import {
  LINE_OFFICIAL_ADD_FRIEND_BTN_SRC,
  LINE_OFFICIAL_ADD_FRIEND_URL,
  LINE_OFFICIAL_PROMO_BODY,
  LINE_OFFICIAL_PROMO_HEADING,
  LINE_OFFICIAL_PROMO_SUBHEADING,
} from "@/lib/official-line/constants";

export default function OfficialLinePromoCard() {
  return (
    <section
      aria-labelledby="official-line-promo-heading"
      className="relative overflow-hidden bg-[#071426] py-16 sm:py-20 lg:py-24"
    >
      <div className="absolute -left-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-amber-300/6 blur-3xl" />
      <div className="absolute -right-32 top-0 h-72 w-72 rounded-full bg-cyan-300/6 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-[#d8b36a]/25 bg-white/[0.04] px-6 py-10 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:px-10 sm:py-12">
          <div className="mb-5 flex items-center justify-center gap-4">
            <span className="h-px w-10 bg-[#d8b36a]/70" aria-hidden />
            <p className="text-xs font-semibold tracking-[0.28em] text-[#d8b36a]">
              OFFICIAL LINE
            </p>
            <span className="h-px w-10 bg-[#d8b36a]/70" aria-hidden />
          </div>

          <h2
            id="official-line-promo-heading"
            className="text-center text-2xl font-semibold leading-snug tracking-[-0.03em] text-white sm:text-[1.65rem]"
          >
            {LINE_OFFICIAL_PROMO_HEADING}
          </h2>
          <p className="mt-3 text-center text-base font-semibold text-[#e8dcc8] sm:text-lg">
            {LINE_OFFICIAL_PROMO_SUBHEADING}
          </p>
          <p className="mx-auto mt-5 max-w-lg text-center text-sm leading-7 text-white/70 sm:text-[15px] sm:leading-8">
            {LINE_OFFICIAL_PROMO_BODY}
          </p>

          <div className="mt-8 flex justify-center">
            <a
              href={LINE_OFFICIAL_ADD_FRIEND_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={LINE_OFFICIAL_ADD_FRIEND_BTN_SRC}
                alt="友だち追加"
                height={36}
                className="border-0"
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
