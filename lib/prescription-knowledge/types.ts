/**
 * メラトニンヨガ™公式処方基準 Ver.1 の知識ユニットと出力型。
 * 画面には全文を出さず、既存分析の出力を読んで A 実践だけを選ぶ。
 */

export type PrescriptionSourceId =
  | "melatonin_yoga"
  | "ma_no_yoga"
  | "ma_no_sho";

export type PrescriptionKind =
  | "night_practice"
  | "day_practice"
  | "ma"
  | "breathing"
  | "rest"
  | "lifestyle"
  | "yoga";

/** 分析上の候補。連続性は Ver.1 では自動処方しない。 */
export type OfficialCandidateThemeId =
  | "sleep_duration"
  | "sleep_onset"
  | "continuity"
  | "recovery";

/** ⑥⑨に出す最終通常テーマ。テーマ5（リズム）は自動選択しない。 */
export type OfficialPrescriptionThemeId =
  | "sleep_duration"
  | "sleep_onset"
  | "recovery"
  | "maintain"
  | "individual_review";

export type OfficialPracticeSlot =
  | "todays_one"
  | "breathing"
  | "yoga"
  | "ma"
  | "bathing"
  | "night"
  | "nap_note";

export type PrescriptionUnit = {
  id: string;
  source: PrescriptionSourceId;
  kind: PrescriptionKind;
  title: string;
  body: string;
  /** true のときだけ Ver.1 が自動選択する（A）。false は知識として残し、自動選択しない */
  autoSelectable: boolean;
  slot: OfficialPracticeSlot;
  themes: readonly OfficialPrescriptionThemeId[];
  /** 今日の一本の理由。slot が todays_one のときだけ使う */
  reason?: string;
};

export type OfficialAdviceBlock = {
  title: string;
  body: string;
  sourceLabel: string;
};

export type OfficialTodaysOne = {
  name: string;
  action: string;
  reason: string;
};

export const OFFICIAL_THEME_LABELS: Record<OfficialPrescriptionThemeId, string> =
  {
    sleep_duration: "睡眠時間を確保する",
    sleep_onset: "眠りへの切り替え",
    recovery: "心身の回復",
    maintain: "良い睡眠を維持する",
    individual_review: "個別確認",
  };

export type OfficialTextPrescription = {
  safetyAlert: OfficialAdviceBlock | null;
  themeCandidates: OfficialCandidateThemeId[];
  finalTheme: OfficialPrescriptionThemeId;
  finalThemeLabel: string;
  themeReason: string;
  todaysOne: OfficialTodaysOne;
  breathing: OfficialAdviceBlock | null;
  yoga: OfficialAdviceBlock | null;
  ma: OfficialAdviceBlock | null;
  bathing: OfficialAdviceBlock | null;
  night: OfficialAdviceBlock | null;
  napNote: OfficialAdviceBlock | null;
};
