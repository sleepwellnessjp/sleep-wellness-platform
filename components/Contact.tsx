const inquiryTypes = [
    "企業導入",
    "講演・研修",
    "取材・メディア",
    "共同研究・実証",
    "養成講座",
    "イベント",
  ];
  
  export default function Contact() {
    return (
      <section
        id="contact"
        className="relative overflow-hidden bg-white py-24 text-[#0b1b31] sm:py-28 lg:py-36"
      >
        <div className="absolute left-0 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-100/50 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[460px] w-[460px] translate-x-1/3 translate-y-1/3 rounded-full bg-amber-100/45 blur-3xl" />
  
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="mb-7 flex items-center gap-4">
                <span className="h-px w-12 bg-[#b89242]" />
                <p className="text-xs font-semibold tracking-[0.28em] text-[#8a6a2d]">
                  CONTACT
                </p>
              </div>
  
              <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                一緒に、
                <br />
                新しい睡眠文化を
                <br />
                <span className="text-[#315f68]">つくりませんか。</span>
              </h2>
  
              <p className="mt-8 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
                睡眠ウェルネスを、企業、教育、地域、メディア、
                イベントなど、さまざまな領域へ広げていくための
                ご相談を受け付けています。
              </p>
  
              <div className="mt-10">
                <p className="text-xs font-bold tracking-[0.22em] text-slate-400">
                  INQUIRY
                </p>
  
                <div className="mt-5 flex flex-wrap gap-3">
                  {inquiryTypes.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#0b1b31]/10 bg-[#f8f8f6] px-4 py-2.5 text-sm font-medium text-[#315f68]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
  
            <div className="rounded-[2rem] border border-slate-200 bg-[#f8f8f6] p-7 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.28)] sm:p-10 lg:p-12">
              <div className="mb-10">
                <p className="text-xs font-semibold tracking-[0.26em] text-[#8a6a2d]">
                  MESSAGE FORM
                </p>
  
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  お問い合わせ
                </h3>
  
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  必要事項をご入力のうえ、送信してください。
                </p>
              </div>
  
              <form className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="text-sm font-semibold text-[#0b1b31]"
                  >
                    お名前
                  </label>
  
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="山田 太郎"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-[#0b1b31] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
                  />
                </div>
  
                <div>
                  <label
                    htmlFor="organization"
                    className="text-sm font-semibold text-[#0b1b31]"
                  >
                    会社・団体名
                  </label>
  
                  <input
                    id="organization"
                    name="organization"
                    type="text"
                    autoComplete="organization"
                    placeholder="会社名・団体名"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-[#0b1b31] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
                  />
                </div>
  
                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-semibold text-[#0b1b31]"
                  >
                    メールアドレス
                  </label>
  
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="example@email.com"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-[#0b1b31] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
                  />
                </div>
  
                <div>
                  <label
                    htmlFor="inquiryType"
                    className="text-sm font-semibold text-[#0b1b31]"
                  >
                    お問い合わせ種別
                  </label>
  
                  <select
                    id="inquiryType"
                    name="inquiryType"
                    defaultValue=""
                    className="mt-3 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-[#0b1b31] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
                  >
                    <option value="" disabled>
                      選択してください
                    </option>
  
                    {inquiryTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
  
                <div>
                  <label
                    htmlFor="message"
                    className="text-sm font-semibold text-[#0b1b31]"
                  >
                    お問い合わせ内容
                  </label>
  
                  <textarea
                    id="message"
                    name="message"
                    rows={7}
                    placeholder="ご相談内容をご入力ください。"
                    className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base leading-7 text-[#0b1b31] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
                  />
                </div>
  
                <button
                  type="button"
                  className="group inline-flex w-full items-center justify-center rounded-full bg-[#0b1b31] px-7 py-4 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#15304f] sm:w-auto"
                >
                  送信する
                  <span
                    aria-hidden="true"
                    className="ml-3 transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    );
  }