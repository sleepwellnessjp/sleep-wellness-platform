"use client";

import { useMemo } from "react";
import DemoFridayPage1 from "@/components/sleep-wellness-report/DemoFridayPage1";
import DemoFridayPage2 from "@/components/sleep-wellness-report/DemoFridayPage2";
import {
  formatDeviceName,
  formatGeneratedAt,
} from "@/components/sleep-wellness-report/report-ui";
import { buildCounselingViewModel } from "@/lib/sleep-analysis/counseling-view-model";
import {
  buildTodayActionLines,
  prescriptionTodayAction,
} from "@/lib/sleep-analysis/demo-report-copy";
import type { SleepAnalysisData } from "@/lib/sleep-analysis/sleep-analysis-model";
import type { SleepWellnessReport } from "@/lib/sleep-analysis/sleep-wellness-report";
import {
  getAidaNoYogaGuidance,
  getMelatoninYogaGuidance,
} from "@/lib/sleep-analysis/swm-yoga-content";

export type SleepWellnessReportViewProps = {
  report: SleepWellnessReport;
  data: SleepAnalysisData;
  clientName?: string | null;
  measurementDate?: string | null;
  storageKey?: string | null;
  className?: string;
  clientAge?: number | null;
  clientGender?: "female" | "male" | "other" | null;
};

/**
 * Sleep Wellness Method™ Ver.1.0 正式版
 * A4 × 2ページ — PAGE1 Assessment / PAGE2 Prescription & Practice
 */
export default function SleepWellnessReportView({
  report,
  data,
  clientName,
  measurementDate,
  storageKey,
  className = "",
  clientAge = null,
  clientGender = null,
}: SleepWellnessReportViewProps) {
  const view = useMemo(
    () => buildCounselingViewModel({ data, report }),
    [data, report],
  );

  const overall = report.overallEvaluation;
  const dayYoga = useMemo(() => getAidaNoYogaGuidance(), []);
  const nightYoga = useMemo(() => getMelatoninYogaGuidance(), []);

  const todayActions = useMemo(() => {
    const lines: string[] = [];
    const top = view.priorityCards[0];
    if (top) {
      lines.push(`${top.label}：${prescriptionTodayAction(top)}`);
    }
    for (const a of report.todaysActions.slice(0, 2)) {
      const line = `${a.title}：${a.body}`;
      if (!lines.some((x) => x.includes(a.title))) lines.push(line);
    }
    const yoga = buildTodayActionLines({
      priorities: view.priorityCards,
      dayYoga,
      nightYoga,
    }).filter((line) => /ヨガ/.test(line));
    lines.push(...yoga);
    return lines.slice(0, 5);
  }, [view.priorityCards, report.todaysActions, dayYoga, nightYoga]);

  const persistKey =
    storageKey?.trim() ||
    `${clientName ?? "session"}:${measurementDate ?? "na"}`;

  return (
    <div
      className={`swr-sheet mx-auto w-full max-w-[640px] space-y-8 sm:space-y-10 print:max-w-none print:space-y-0 ${className}`}
    >
      <DemoFridayPage1
        clientName={clientName}
        measurementDate={measurementDate}
        device={overall.device}
        generatedAt={report.meta.generatedAt}
        totalScore={overall.totalScore}
        grade={overall.grade}
        headline={overall.headline}
        coverageLabel={overall.coverageLabel}
        summary={view.todaySummary}
        factors={report.sources.score.factors}
        clientAge={clientAge}
        clientGender={clientGender}
      />

      <DemoFridayPage2
        priorities={view.priorityCards}
        dayYoga={dayYoga}
        nightYoga={nightYoga}
        storageKey={persistKey}
        todayActions={todayActions}
        nextChecks={view.followUp}
        clientName={clientName}
        measurementDate={measurementDate}
        deviceLabel={formatDeviceName(overall.device)}
        generatedAtLabel={formatGeneratedAt(report.meta.generatedAt)}
      />
    </div>
  );
}
