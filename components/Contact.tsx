"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

const inquiryTypes = [
  "企業導入",
  "講演・研修",
  "取材・メディア",
  "共同研究・実証",
  "養成講座",
  "イベント",
];

const inputClass =
  "mt-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-[#0b1b31] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10";

export default function Contact() {
  const [inquiryType, setInquiryType] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

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

            <div className="relative mt-10 overflow-hidden rounded-[28px] shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
              <div className="relative aspect-[16/11]">
                <Image
                  src="/yogafest.jpg"
                  alt="Sleep Wellness Institute Japanの活動風景"
                  fill
                  className="object-cover object-center"
                  sizes="(min-width:1024px) 40vw,100vw"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/85 via-[#071426]/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <p className="text-xs font-semibold tracking-[0.24em] text-amber-200">
                    COLLABORATION
                  </p>
                  <p className="mt-3 text-xl font-medium leading-snug tracking-[-0.03em] text-white sm:text-2xl">
                    企業・教育・地域・メディアと、
                    <br />
                    眠りの文化をつくる。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <p className="text-xs font-bold tracking-[0.22em] text-slate-400">
                INQUIRY TYPE
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {inquiryTypes.map((item) => {
                  const active = inquiryType === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setInquiryType(item)}
                      className={`rounded-full border px-4 py-2.5 text-sm font-medium transition duration-300 ${
                        active
                          ? "border-[#071426] bg-[#071426] text-white"
                          : "border-[#0b1b31]/10 bg-[#f8f8f6] text-[#315f68] hover:border-[#315f68]/35 hover:bg-white"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-[#f8f8f6] p-7 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.28)] sm:p-10 lg:p-12">
            {submitted ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <p className="text-xs font-semibold tracking-[0.26em] text-[#8a6a2d]">
                  THANK YOU
                </p>

                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#071426]">
                  お問い合わせを
                  <br />
                  受け付けました
                </h3>

                <p className="mt-6 max-w-md text-base leading-8 text-slate-600">
                  内容を確認のうえ、担当よりご連絡いたします。
                  しばらくお待ちください。
                </p>

                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-10 inline-flex items-center justify-center rounded-full border border-[#071426]/15 bg-white px-7 py-3.5 text-sm font-semibold text-[#071426] transition hover:-translate-y-0.5"
                >
                  別のご相談を送る
                </button>
              </div>
            ) : (
              <>
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

                <form className="space-y-6" onSubmit={handleSubmit}>
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
                      required
                      autoComplete="name"
                      placeholder="山田 太郎"
                      className={inputClass}
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
                      className={inputClass}
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
                      required
                      autoComplete="email"
                      placeholder="example@email.com"
                      className={inputClass}
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
                      required
                      value={inquiryType}
                      onChange={(event) => setInquiryType(event.target.value)}
                      className={`${inputClass} appearance-none`}
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
                      required
                      rows={7}
                      placeholder="ご相談内容をご入力ください。"
                      className={`${inputClass} resize-none leading-7`}
                    />
                  </div>

                  <button
                    type="submit"
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
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
