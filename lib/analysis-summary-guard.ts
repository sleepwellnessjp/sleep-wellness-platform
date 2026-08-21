/**
 * AI summary（総評）の品質ガード。
 * 因果の逆転・空の定型句を検出し、必要なら1回だけ再生成する。
 */

export type SummaryQualityIssue =
  | "causal_sleep_duration_spo2"
  | "causal_metric_chain"
  | "empty_boilerplate_ending";

/** 内容の無い定型句 */
const EMPTY_BOILERPLATE =
  /年齢と性別を考慮|改善に向けた意識が大切|意識が大切です|心がけましょう|意識しましょう|年齢・性別を考慮|目指しましょう|心がけて/u;

/**
 * 睡眠時間不足 → SpO₂/酸素 の因果断定だけを拾う。
 * 「短く、また平均SpO₂」「短く、平均SpO₂は91%」のような並列列挙は許可する。
 */
export function hasCausalSleepDurationToSpo2(text: string): boolean {
  // ユーザー指摘の典型：「短く、酸素供給が不十分」
  if (
    /(?:総)?睡眠時間[^。]{0,40}(?:短|不足)[^。]{0,30}酸素供給が不十分/u.test(text)
  ) {
    return true;
  }
  if (
    /睡眠時間[^。]{0,50}(?:ため|により|から|起因して|原因で)[^。]{0,40}(?:酸素|SpO|酸素供給)/u.test(
      text,
    )
  ) {
    return true;
  }
  if (
    /(?:酸素供給|SpO)[^。]{0,40}(?:睡眠時間|睡眠不足)[^。]{0,25}(?:原因|による|ため|から)/u.test(
      text,
    )
  ) {
    return true;
  }
  // 「短く酸素が」「不足し酸素が」など接続助詞なしの直結
  if (
    /(?:総)?睡眠時間[^。]{0,40}(?:短く|不足し)(?:酸素|SpO)/u.test(text)
  ) {
    return true;
  }
  return false;
}

export function detectSummaryQualityIssues(
  summary: string,
): SummaryQualityIssue[] {
  const text = summary.trim();
  if (!text) return [];

  const issues: SummaryQualityIssue[] = [];

  if (hasCausalSleepDurationToSpo2(text)) {
    issues.push("causal_sleep_duration_spo2");
  }

  // 「引き起こす」等の明示的な因果語＋両指標
  if (
    /(?:引き起こ|もたら|原因とな)/u.test(text) &&
    /(?:酸素|SpO)/u.test(text) &&
    /睡眠時間|睡眠不足/u.test(text)
  ) {
    issues.push("causal_metric_chain");
  }

  if (EMPTY_BOILERPLATE.test(text)) {
    issues.push("empty_boilerplate_ending");
  }

  return issues;
}

export function summaryHasQualityIssues(summary: string): boolean {
  return detectSummaryQualityIssues(summary).length > 0;
}

export const SUMMARY_REWRITE_INSTRUCTIONS = `あなたは Sleep Wellness Institute Japan の総評（summary）校正者です。
与えられた summary を、次の制約を満たす日本語に書き直してください。

【必須】
- 120〜220文字程度
- 良かった点（指標名＋数値）から始める
- 整え余地は「一方で」「また」で並列に述べる（因果断定禁止）
- 特に「睡眠時間の不足が SpO₂／酸素供給の低下の原因」という趣旨は禁止
- SpO₂・酸素と睡眠時間に触れる場合は、必ず「一方で」「また」で別々の観察として並べる
- 「短く、酸素供給が不十分」のように読める一文は禁止
- 具体的な指標名と数値を伴わない一般論で締めない
- 「年齢と性別を考慮」「意識が大切」「心がけましょう」等の抽象的な結びは禁止
- 医療診断表現禁止。「可能性があります」トーンを保つ

出力は JSON のみ: { "summary": "..." }`;
