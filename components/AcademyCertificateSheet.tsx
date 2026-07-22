"use client";

import Image from "next/image";
import { getQualification } from "@/lib/academy/catalog";
import { formatJaDate } from "@/lib/academy/scoring";
import type { AcademyCredential } from "@/lib/academy/types";
import { GOLD, NAVY } from "@/components/ui/tokens";

type Props = {
  credential: AcademyCredential;
  holderName: string;
  className?: string;
};

/** 画面プレビュー兼印刷用認定証シート */
export default function AcademyCertificateSheet({
  credential,
  holderName,
  className = "",
}: Props) {
  const qualification = getQualification(credential.qualificationId);

  return (
    <article
      className={`academy-certificate-sheet relative overflow-hidden rounded-[28px] border border-[#d8b36a]/50 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-6 py-10 sm:px-12 sm:py-14 ${className}`}
      style={{ color: NAVY }}
    >
      <div
        className="pointer-events-none absolute inset-4 rounded-[22px] border border-[#b89242]/35"
        aria-hidden
      />
      <div className="relative flex flex-col items-center text-center">
        <Image
          src="/swij-logo-horizontal.png"
          alt="Sleep Wellness Institute Japan"
          width={220}
          height={56}
          className="h-auto w-[160px] sm:w-[200px]"
          priority
        />
        <p
          className="mt-8 text-[10px] font-semibold tracking-[0.32em] sm:text-[11px]"
          style={{ color: GOLD }}
        >
          CERTIFICATE OF COMPLETION
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          認定証
        </h1>
        <p className="mt-8 text-[13px] leading-7 text-slate-600 sm:text-[15px]">
          下記の者は、所定の課程を修了し
          <br className="sm:hidden" />
          ここに認定されたことを証します。
        </p>

        <p className="mt-10 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
          {holderName}
        </p>
        <div className="mt-2 h-px w-40 bg-[#d8b36a]/70" />

        <p className="mt-8 text-[11px] font-semibold tracking-[0.2em] text-slate-500">
          資格名
        </p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] sm:text-xl">
          {qualification?.name ?? credential.qualificationId}
        </p>

        <dl className="mt-10 grid w-full max-w-md gap-4 text-left sm:grid-cols-2">
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              認定番号
            </dt>
            <dd className="mt-1 text-[14px] font-semibold tracking-[-0.02em]">
              {credential.certificateNumber}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              発行日
            </dt>
            <dd className="mt-1 text-[14px] font-semibold tracking-[-0.02em]">
              {formatJaDate(credential.issuedAt.slice(0, 10))}
            </dd>
          </div>
        </dl>

        <p className="mt-10 text-[12px] leading-6 text-slate-500">
          Sleep Wellness Institute Japan
          <br />
          Sleep Wellness Academy
        </p>
      </div>
    </article>
  );
}
