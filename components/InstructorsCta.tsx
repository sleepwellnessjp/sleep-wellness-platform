import Link from "next/link";

/**
 * トップページ用の短い導線。一覧そのものは載せない。
 */
export default function InstructorsCta() {
  return (
    <section
      id="instructors"
      className="relative overflow-hidden bg-white py-12 sm:py-14"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8a6a2d]/40 to-transparent" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 text-center lg:px-8">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
          CERTIFIED INSTRUCTORS
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#071426] sm:text-3xl">
          メラトニンヨガ™認定講師
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          全国の認定講師を、活動地域・指導分野から探せます。
        </p>
        <Link
          href="/instructors"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#071426] px-7 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#0d2238] hover:shadow-[0_18px_40px_-24px_rgba(7,20,38,0.55)] sm:text-base"
        >
          認定講師を探す
        </Link>
      </div>
    </section>
  );
}
