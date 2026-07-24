"use client";

import Image from "next/image";
import {
  CERTIFICATION_LEVEL_LABELS,
  formatJaDate,
} from "@/lib/license/constants";
import { qrImageSrc, verificationPayload } from "@/lib/license/qr";
import type {
  CertificateRecord,
  CertificationLevel,
  LicenseRecord,
} from "@/lib/license/types";
import { GOLD, NAVY } from "@/components/ui/tokens";

type Props = {
  license: LicenseRecord;
  certificate: CertificateRecord;
  className?: string;
};

export default function LicenseCertificateSheet({
  license,
  certificate,
  className = "",
}: Props) {
  const levelLabel =
    CERTIFICATION_LEVEL_LABELS[
      license.certificationLevel as CertificationLevel
    ] ?? license.certificationLevel;
  const qrSrc = qrImageSrc(
    verificationPayload(certificate.verificationCode),
    148,
  );

  return (
    <article
      className={`license-certificate-sheet relative overflow-hidden rounded-[28px] border border-[#d8b36a]/50 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-6 py-10 sm:px-12 sm:py-14 ${className}`}
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
          CERTIFIED INSTRUCTOR LICENSE
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          認定証
        </h1>
        <p className="mt-8 text-[13px] leading-7 text-slate-600 sm:text-[15px]">
          下記の者は、Sleep Wellness Institute Japan の
          <br className="sm:hidden" />
          所定の課程を修了しここに認定されたことを証します。
        </p>

        <p className="mt-10 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
          {certificate.holderName}
        </p>
        <div className="mt-2 h-px w-40 bg-[#d8b36a]/70" />

        <p className="mt-8 text-[11px] font-semibold tracking-[0.2em] text-slate-500">
          認定レベル
        </p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] sm:text-xl">
          {levelLabel}
        </p>

        <dl className="mt-10 grid w-full max-w-lg gap-4 text-left sm:grid-cols-2">
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              認定番号
            </dt>
            <dd className="mt-1 break-all text-[14px] font-semibold tracking-[-0.02em]">
              {certificate.certificateNumber}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              ライセンス番号
            </dt>
            <dd className="mt-1 break-all text-[14px] font-semibold tracking-[-0.02em]">
              {license.licenseNumber}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              認定日
            </dt>
            <dd className="mt-1 text-[14px] font-semibold tracking-[-0.02em]">
              {formatJaDate(certificate.issuedAt)}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              有効期限
            </dt>
            <dd className="mt-1 text-[14px] font-semibold tracking-[-0.02em]">
              {formatJaDate(license.expiresAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`検証用 QR（${certificate.verificationCode}）`}
            width={148}
            height={148}
            className="rounded-xl border border-slate-200 bg-white p-2"
          />
          <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500">
            検証コード
          </p>
          <p className="font-mono text-[13px] font-semibold tracking-wider">
            {certificate.verificationCode}
          </p>
        </div>

        <p className="mt-10 text-[12px] leading-6 text-slate-500">
          Sleep Wellness Institute Japan
          <br />
          Certified Instructor Program
        </p>
      </div>
    </article>
  );
}
