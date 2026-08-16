"use client";

import Image from "next/image";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  formatDeviceName,
  formatGeneratedAt,
} from "@/components/sleep-wellness-report/report-ui";

export type ReportHeaderProps = {
  clientName?: string | null;
  measurementDate?: string | null;
  device: string;
  generatedAt: string;
  totalScore: number | null;
  grade: string | null;
};

export default function ReportHeader({
  clientName,
  measurementDate,
  device,
  generatedAt,
  totalScore,
  grade,
}: ReportHeaderProps) {
  return (
    <header className="swr-print-avoid swr-brand-header rounded-[28px] border border-[rgba(138,106,45,0.28)] bg-white px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Image
            src="/swij-logo-horizontal.png"
            alt="Sleep Wellness Institute Japan"
            width={200}
            height={50}
            className="h-auto w-[120px] object-contain sm:w-[148px]"
            priority
          />
          <p
            className="mt-3 text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS INSTITUTE JAPAN
          </p>
          <h1
            className="mt-1.5 text-[1.55rem] font-semibold leading-tight tracking-[-0.035em] sm:text-[1.85rem]"
            style={{ color: NAVY }}
          >
            Sleep Wellness Report
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-slate-500">
            認定講師カウンセリング用レポート
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p
            className="text-[10px] font-semibold tracking-[0.14em]"
            style={{ color: GOLD }}
          >
            Sleep Wellness Score
          </p>
          <p
            className="mt-1 text-[2.5rem] font-semibold leading-none tracking-[-0.05em]"
            style={{ color: NAVY }}
          >
            {totalScore ?? "—"}
          </p>
          <p className="mt-1 text-[11px] tracking-[0.12em] text-slate-400">
            {grade ? `GRADE ${grade}` : "—"}
          </p>
        </div>
      </div>
      <div className="swr-meta-row mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[rgba(7,20,38,0.06)] pt-3 text-[12px] text-slate-500">
        {clientName ? (
          <span className="font-medium" style={{ color: NAVY }}>
            {clientName} 様
          </span>
        ) : null}
        {measurementDate ? <span>測定日 {measurementDate}</span> : null}
        <span>デバイス {formatDeviceName(device)}</span>
        <span>生成日 {formatGeneratedAt(generatedAt)}</span>
      </div>
    </header>
  );
}
