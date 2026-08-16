"use client";

import Image from "next/image";
import { GOLD, GOLD_MID, NAVY } from "@/components/ui/tokens";
import {
  formatDeviceName,
  formatGeneratedAt,
} from "@/components/sleep-wellness-report/report-ui";
import type { CounselingPriorityCard } from "@/lib/sleep-analysis/counseling-view-model";
import type { TodayTheme } from "@/lib/sleep-analysis/session-guide";

export type TodayPrescriptionPageProps = {
  clientName?: string | null;
  measurementDate?: string | null;
  device: string;
  generatedAt: string;
  totalScore: number | null;
  grade: string | null;
  theme: TodayTheme;
  priorities: CounselingPriorityCard[];
  focus: string;
};

export default function TodayPrescriptionPage({
  clientName,
  measurementDate,
  device,
  generatedAt,
  totalScore,
  grade,
  theme,
  priorities,
  focus,
}: TodayPrescriptionPageProps) {
  return (
    <section className="swr-print-page swr-print-page-1 space-y-5">
      <header className="swr-print-avoid rounded-[24px] border border-[rgba(138,106,45,0.25)] bg-white px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={180}
              height={45}
              className="h-auto w-[110px] object-contain sm:w-[130px]"
              priority
            />
            <p
              className="mt-3 text-[10px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              PAGE 1 · PRESCRIPTION
            </p>
            <h1
              className="mt-1 text-[1.45rem] font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              Today&apos;s Prescription
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">今日の処方</p>
          </div>
          <div className="text-right">
            <p
              className="text-[10px] font-semibold tracking-[0.14em]"
              style={{ color: GOLD }}
            >
              Score
            </p>
            <p
              className="mt-1 text-[2.5rem] font-semibold leading-none tracking-[-0.05em]"
              style={{ color: NAVY }}
            >
              {totalScore ?? "—"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {grade ? `GRADE ${grade}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[rgba(7,20,38,0.06)] pt-3 text-[12px] text-slate-500">
          {clientName ? (
            <span className="font-medium" style={{ color: NAVY }}>
              {clientName} 様
            </span>
          ) : null}
          {measurementDate ? <span>測定日 {measurementDate}</span> : null}
          <span>{formatDeviceName(device)}</span>
          <span>{formatGeneratedAt(generatedAt)}</span>
        </div>
      </header>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(138,106,45,0.22)] bg-[#fffdf8] px-5 py-6 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Today&apos;s Goal
        </p>
        <p
          className="mt-3 text-[1.35rem] font-semibold leading-snug tracking-[-0.03em] sm:text-[1.5rem]"
          style={{ color: NAVY }}
        >
          {theme.sentence}
        </p>
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Priority Top 3
        </p>
        <ol className="mt-4 space-y-3">
          {priorities.slice(0, 3).map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-3 rounded-2xl bg-[#fafafa] px-4 py-3.5"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                style={{
                  background:
                    item.rank === 1
                      ? GOLD_MID
                      : item.rank === 2
                        ? "#315f68"
                        : "rgba(7,20,38,0.45)",
                }}
              >
                {item.rank}
              </span>
              <div className="min-w-0">
                <p
                  className="text-[15px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {item.label}
                  <span className="ml-2 text-[11px] font-medium text-slate-400">
                    優先度 {item.level}
                  </span>
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  {item.relatedValue}
                </p>
                <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
                  {item.shortPolicy}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Today&apos;s Focus
        </p>
        <p
          className="mt-3 text-[15px] font-medium leading-8"
          style={{ color: NAVY }}
        >
          {focus}
        </p>
      </div>
    </section>
  );
}
