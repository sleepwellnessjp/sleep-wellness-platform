/**
 * メラトニンヨガ™公式処方基準 Ver.1。
 * 既存の分析結果（Insight / Priority / caution）を読むだけ。A 実践のみ選ぶ。
 * Score・Insight・Priority・安全判定の計算は変更しない。
 */

import type { AnalysisResult } from "@/lib/analysis-session";
import { buildSleepWellnessReportFromAnalysisResult } from "@/lib/sleep-analysis/from-analysis-result";
import type { LifestyleSnapshot } from "@/lib/wellness-client-report";
import type {
  OfficialAdviceBlock,
  OfficialCandidateThemeId,
  OfficialPracticeSlot,
  OfficialPrescriptionThemeId,
  OfficialTextPrescription,
  OfficialTodaysOne,
  PrescriptionSourceId,
  PrescriptionUnit,
} from "@/lib/prescription-knowledge/types";
import { OFFICIAL_THEME_LABELS } from "@/lib/prescription-knowledge/types";
import { MELATONIN_YOGA_UNITS } from "@/lib/prescription-knowledge/units-melatonin-yoga";
import { MA_NO_YOGA_UNITS } from "@/lib/prescription-knowledge/units-ma-no-yoga";
import { MA_NO_SHO_UNITS } from "@/lib/prescription-knowledge/units-ma-no-sho";

const ALL_UNITS: readonly PrescriptionUnit[] = [
  ...MELATONIN_YOGA_UNITS,
  ...MA_NO_YOGA_UNITS,
  ...MA_NO_SHO_UNITS,
];

const SOURCE_LABEL: Record<PrescriptionSourceId, string> = {
  melatonin_yoga: "メラトニンヨガ™公式テキスト",
  ma_no_yoga: "間のヨガ公式テキスト",
  ma_no_sho: "『間の書』（公式テキストより）",
};

const PRIORITY_TO_CANDIDATE: Partial<
  Record<string, OfficialCandidateThemeId>
> = {
  sleepDuration: "sleep_duration",
  sleepLatency: "sleep_onset",
  sleepEfficiency: "continuity",
  hrv: "recovery",
  stress: "recovery",
  recovery: "recovery",
};

const INSIGHT_TO_CANDIDATES: Record<string, OfficialCandidateThemeId[]> = {
  rem_short_with_sleep_debt: ["sleep_duration"],
  short_sleep_low_efficiency: ["sleep_duration", "continuity"],
  adequate_duration_low_efficiency: ["continuity"],
  autonomic_stress_load: ["recovery"],
  deep_sleep_recovery_deficit: ["recovery"],
  low_hrv_poor_deep_sleep: ["recovery"],
  stress_blocks_recovery: ["recovery"],
};

const CANDIDATE_ORDER: OfficialCandidateThemeId[] = [
  "sleep_duration",
  "sleep_onset",
  "continuity",
  "recovery",
];

const AUTO_THEME_ORDER: OfficialPrescriptionThemeId[] = [
  "sleep_duration",
  "sleep_onset",
  "recovery",
];

const THEME_REASON: Record<OfficialPrescriptionThemeId, string> = {
  sleep_duration:
    "既存分析で、睡眠時間の優先項目または睡眠不足に伴う Insight が示されています。",
  sleep_onset: "既存分析で、入眠潜時が優先項目として示されています。",
  recovery:
    "既存分析で、HRV・ストレス・回復の優先項目、または回復系 Insight が示されています。",
  maintain: "改善対象となる Insight / Priority がありません。",
  individual_review:
    "公式テキストで自動処方できる明確なテーマがありません。生活を聞いて一本を選びます。",
};

const PRACTICE_SLOTS: OfficialPracticeSlot[] = [
  "breathing",
  "yoga",
  "ma",
  "bathing",
  "night",
  "nap_note",
];

function toBlock(unit: PrescriptionUnit): OfficialAdviceBlock {
  return {
    title: unit.title,
    body: unit.body,
    sourceLabel: SOURCE_LABEL[unit.source],
  };
}

function pickUnit(
  slot: OfficialPracticeSlot,
  theme: OfficialPrescriptionThemeId,
): PrescriptionUnit | null {
  return (
    ALL_UNITS.find(
      (unit) =>
        unit.autoSelectable &&
        unit.slot === slot &&
        unit.themes.includes(theme),
    ) ?? null
  );
}

function pickTodaysOne(theme: OfficialPrescriptionThemeId): OfficialTodaysOne {
  const unit = pickUnit("todays_one", theme);
  if (!unit) {
    return {
      name: "生活を聞いて一本",
      reason:
        "公式テキストは、相手の生活を聞き、いちばん変えやすい柱を一本だけ選ぶことを示しています。",
      action:
        "ポーズや新しい実践を先に決めず、生活の流れを聞いてから、いちばん変えやすい柱を一つ選んでください。",
    };
  }
  return {
    name: unit.title,
    reason:
      unit.reason ??
      "8つを同時に始める必要はありません。いちばん変えやすい一本から。",
    action: unit.body,
  };
}

function isRespiratorySpo2Caution(caution: string | null): boolean {
  if (!caution) return false;
  return caution.includes("呼吸・SpO2") || caution.includes("呼吸・SpO₂");
}

function isCoverageCaution(caution: string | null): boolean {
  if (!caution) return false;
  return caution.includes("利用可能指標が少ない");
}

function collectCandidates(
  insightIds: readonly string[],
  priorityKeys: readonly string[],
): OfficialCandidateThemeId[] {
  const found = new Set<OfficialCandidateThemeId>();
  for (const key of priorityKeys) {
    const theme = PRIORITY_TO_CANDIDATE[key];
    if (theme) found.add(theme);
  }
  for (const id of insightIds) {
    const themes = INSIGHT_TO_CANDIDATES[id];
    if (!themes) continue;
    for (const theme of themes) found.add(theme);
  }
  return CANDIDATE_ORDER.filter((theme) => found.has(theme));
}

function resolveFinalTheme(
  candidates: readonly OfficialCandidateThemeId[],
  insightEmpty: boolean,
  priorityEmpty: boolean,
  coverageLimited: boolean,
): OfficialPrescriptionThemeId {
  const autoTheme = AUTO_THEME_ORDER.find((theme) =>
    candidates.includes(theme as OfficialCandidateThemeId),
  );
  if (autoTheme) return autoTheme;

  if (insightEmpty && priorityEmpty && !coverageLimited) {
    return "maintain";
  }
  return "individual_review";
}

export function selectOfficialTextPrescription(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot | null,
): OfficialTextPrescription {
  // Ver.1 は緊張／お風呂好きを生活欄から推測しない（公式タイプは聞き取り）。
  void lifestyle;
  const report = buildSleepWellnessReportFromAnalysisResult(result);
  const caution = report.instructorMemo.caution;
  const insightIds = report.sources.insight.matchedRuleIds;
  const priorityKeys = report.sources.priority.items.map((item) => item.key);
  const insightEmpty = insightIds.length === 0;
  const priorityEmpty = priorityKeys.length === 0;
  const coverageLimited = isCoverageCaution(caution);
  const themeCandidates = collectCandidates(insightIds, priorityKeys);
  const finalTheme = resolveFinalTheme(
    themeCandidates,
    insightEmpty,
    priorityEmpty,
    coverageLimited,
  );

  const practices: Record<
    "breathing" | "yoga" | "ma" | "bathing" | "night" | "napNote",
    OfficialAdviceBlock | null
  > = {
    breathing: null,
    yoga: null,
    ma: null,
    bathing: null,
    night: null,
    napNote: null,
  };
  for (const slot of PRACTICE_SLOTS) {
    const unit = pickUnit(slot, finalTheme);
    if (!unit) continue;
    if (slot === "nap_note") practices.napNote = toBlock(unit);
    else if (slot === "breathing") practices.breathing = toBlock(unit);
    else if (slot === "yoga") practices.yoga = toBlock(unit);
    else if (slot === "ma") practices.ma = toBlock(unit);
    else if (slot === "bathing") practices.bathing = toBlock(unit);
    else if (slot === "night") practices.night = toBlock(unit);
  }

  return {
    safetyAlert: isRespiratorySpo2Caution(caution)
      ? {
          title: "安全確認",
          body: `${caution} 公式テキストは、生活習慣の問題として扱わず、必要に応じて睡眠を専門とする医療機関への相談をすすめています。ヨガで治療する処方ではありません。`,
          sourceLabel: "既存の睡眠分析注意 / メラトニンヨガ™公式テキスト",
        }
      : null,
    themeCandidates,
    finalTheme,
    finalThemeLabel: OFFICIAL_THEME_LABELS[finalTheme],
    themeReason: THEME_REASON[finalTheme],
    todaysOne: pickTodaysOne(finalTheme),
    breathing: practices.breathing,
    yoga: practices.yoga,
    ma: practices.ma,
    bathing: practices.bathing,
    night: practices.night,
    napNote: practices.napNote,
  };
}
