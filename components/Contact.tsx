"use client";

import { FormEvent, useState } from "react";

const inquiryTypes = [
  "養成講座・認定講師",
  "睡眠分析",
  "企業導入",
  "講演・研修",
  "取材・メディア",
  "その他",
];

const inputClass =
  "mt-2.5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-base text-white outline-none transition duration-300 placeholder:text-white/35 focus:border-[#d8b36a]/50 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#d8b36a]/10";

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
      className="relative overflow-hidden bg-[#071426] py-24 text-white sm:py-20 lg:py-24"
    >
      <div className="absolute left-0 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/8 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[360px] w-[360px] translate-x-1/3 translate-y-1/3 rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <div className="mb-5 flex items-center gap-4">
              <span className="h-px w-12 bg-[#d8b36a]" />
              <p className="text-xs font-semibold tracking-[0.28em] text-[#d8b36a]">
                CONTACT
              </p>
            </div>

            <h2 className="text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-4xl lg:text-5xl">
              お問い合わせ
            </h2>

            <p className="mt-5 max-w-md text-base leading-8 text-white/70">
              認定講師・睡眠分析・企業導入など、ご相談を受け付けています。
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {inquiryTypes.map((item) => {
                const active = inquiryType === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setInquiryType(item)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition duration-300 ${
                      active
                        ? "border-[#d8b36a] bg-[#d8b36a] text-[#071426]"
                        : "border-white/12 bg-white/[0.04] text-white/70 hover:border-white/25 hover:bg-white/[0.08]"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] bg-[#0c1e37] p-[1px] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.65)]">
            <div
              className="pointer-events-none absolute inset-0 opacity-80"
              aria-hidden="true"
              style={{
                background:
                  "linear-gradient(135deg, rgba(216,179,106,0.55), rgba(49,95,104,0.35), rgba(255,255,255,0.08), rgba(216,179,106,0.4))",
              }}
            />

            <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-[#0c1e37]">
              <div className="relative p-6 sm:p-8 lg:p-10">
                {submitted ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                    <p className="text-xs font-semibold tracking-[0.26em] text-[#d8b36a]">
                      THANK YOU
                    </p>
                    <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                      お問い合わせを受け付けました
                    </h3>
                    <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">
                      内容を確認のうえ、担当よりご連絡いたします。
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="mt-8 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#d8b36a]/40 hover:bg-white/10"
                    >
                      別のご相談を送る
                    </button>
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                      <label
                        htmlFor="name"
                        className="text-sm font-semibold text-white/85"
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
                        htmlFor="email"
                        className="text-sm font-semibold text-white/85"
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
                        className="text-sm font-semibold text-white/85"
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
                        <option value="" disabled className="bg-[#071426]">
                          選択してください
                        </option>
                        {inquiryTypes.map((item) => (
                          <option
                            key={item}
                            value={item}
                            className="bg-[#071426]"
                          >
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="text-sm font-semibold text-white/85"
                      >
                        お問い合わせ内容
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        placeholder="ご相談内容をご入力ください。"
                        className={`${inputClass} resize-none leading-7`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="group inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#e6c78a] via-[#d8b36a] to-[#c49a4a] px-7 py-3.5 text-sm font-bold text-[#071426] shadow-[0_18px_40px_-20px_rgba(216,179,106,0.7)] transition duration-500 hover:-translate-y-0.5 sm:w-auto"
                    >
                      送信する
                      <span
                        aria-hidden="true"
                        className="ml-3 transition-transform duration-500 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
