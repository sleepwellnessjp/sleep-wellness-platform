/**
 * 分析結果レポートのセクション表示フラグ（デモ向け一時非表示）。
 * 削除ではなく描画のみ切る。計算処理は止めない。
 * 9月以降は該当キーを true に戻す。
 */

export const REPORT_SECTIONS = {
  overall: true, // ① 今日の総合評価
  profile: true, // ② 基本情報
  measurement: true, // ③ SOXAIデータ
  insight: false, // ④ 今日の睡眠の読み解き
  priority: true, // ⑤ 改善優先順位
  melatoninYoga: true, // ⑥ メラトニンヨガ™処方（結果画面）
  /** PDF ⑥ LIFESTYLE「生活とのつながり」。結果画面の同名ブロックは対象外 */
  pdfLifestyle: false,
  homework: true, // ⑦ 今日やること＋宿題
  next: false, // ⑧ 次回への見通し
  counseling: false, // ⑨ AIカウンセリング支援
  operations: true, // ⑩ 講師記録・運用
  recoveryIndex: false, // ①内の回復指数カード＋ヘッダー回復指数
} as const;

export type ReportSectionKey = keyof typeof REPORT_SECTIONS;

/** 結果画面の section id → フラグキー */
export const RESULT_SECTION_FLAG: Record<string, ReportSectionKey> = {
  "result-section-1": "overall",
  "result-section-2": "profile",
  "result-section-3": "measurement",
  "result-section-4": "insight",
  "result-section-5": "priority",
  "result-section-6": "melatoninYoga",
  "result-section-7": "homework",
  "result-section-8": "next",
  "result-section-9": "counseling",
  "result-section-10": "operations",
};

export function isReportSectionVisible(key: ReportSectionKey): boolean {
  return REPORT_SECTIONS[key];
}

export function isResultSectionIdVisible(sectionId: string): boolean {
  const key = RESULT_SECTION_FLAG[sectionId];
  if (!key) return true;
  return REPORT_SECTIONS[key];
}
