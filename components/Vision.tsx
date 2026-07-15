import Image from "next/image";

export default function Vision() {
  return (
    <section
      id="vision"
      className="relative min-h-screen overflow-hidden bg-[#071426] text-white"
    >
      <div className="absolute inset-0">
        <Image
          src="/melatonin-yoga.jpg"
          alt="メラトニンヨガの実践風景"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />

        <div className="absolute inset-0 bg-[#071426]/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071426]/75 via-[#071426]/40 to-[#071426]/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071426]/35 via-transparent to-[#071426]/35" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-28 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold tracking-[0.32em] text-white/65 sm:text-sm">
            OUR VISION
          </p>

          <h2 className="mt-8 text-6xl font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-7xl md:text-8xl lg:text-[9rem]">
            Sleep is
            <br />
            the Foundation
            <br />
            of Life.
          </h2>

          <p className="mt-10 text-3xl font-medium leading-tight tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
            睡眠を、
            <br className="sm:hidden" />
            人生の土台へ。
          </p>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-white/75 sm:text-lg lg:text-xl lg:leading-9">
            睡眠を夜だけの問題として捉えず、
            <br className="hidden sm:block" />
            日中の活動、呼吸、身体、心、生活習慣まで含めて整える。
            <br className="hidden sm:block" />
            それが、私たちの考える睡眠ウェルネスです。
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
    </section>
  );
}