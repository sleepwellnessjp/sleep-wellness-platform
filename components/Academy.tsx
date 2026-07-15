const academyPrograms = [
    {
      icon: "●",
      title: "Sleep Wellness Navigator",
      description: "睡眠ウェルネスを学ぶ入門資格",
    },
    {
      icon: "◐",
      title: "Melatonin Yoga™ Instructor",
      description: "メラトニンヨガ™認定指導者",
    },
    {
      icon: "◆",
      title: "Sleep Wellness Producer",
      description:
        "企業・地域・教育へ睡眠ウェルネスを広げるプロフェッショナル",
    },
  ];
  
  export default function Academy() {
    return (
      <section
        id="academy"
        className="relative overflow-hidden bg-white py-24 sm:py-28 lg:py-36"
      >
        <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-100/40 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-amber-100/35 blur-3xl" />
  
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
              ACADEMY
            </p>
  
            <h2 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-[#071426] sm:text-5xl lg:text-6xl">
              Sleep Wellness Academy
            </h2>
  
            <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              睡眠ウェルネスを学び、
              <br className="sm:hidden" />
              社会へ届ける人材を育成します。
            </p>
          </div>
  
          <div className="mt-16 grid gap-7 md:grid-cols-3 lg:mt-20">
            {academyPrograms.map((program) => (
              <article
                key={program.title}
                className="group rounded-[24px] border border-slate-200 bg-[#fafaf8] p-10 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-2 hover:border-[#315f68]/20 hover:bg-white hover:shadow-[0_35px_90px_-40px_rgba(15,23,42,0.28)]"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#315f68]/10 text-3xl font-semibold text-[#315f68] transition-all duration-300 group-hover:bg-[#315f68] group-hover:text-white">
                  {program.icon}
                </div>
  
                <h3 className="mt-10 text-2xl font-semibold leading-snug tracking-[-0.03em] text-[#071426]">
                  {program.title}
                </h3>
  
                <p className="mt-5 text-base leading-8 text-slate-600">
                  {program.description}
                </p>
              </article>
            ))}
          </div>
  
          <div className="mt-16 flex justify-center lg:mt-20">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#315f68]/15 bg-[#315f68]/5 px-7 py-3 text-sm font-semibold tracking-[0.20em] text-[#315f68]">
              <span className="text-base">●</span>
              <span>COMING SOON</span>
            </div>
          </div>
        </div>
      </section>
    );
  }