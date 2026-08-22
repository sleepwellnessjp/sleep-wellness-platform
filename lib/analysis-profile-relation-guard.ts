/**
 * profileRelation（PDF⑥「生活とのつながり」）から
 * 4領域点・総合スコア言及を除く。
 * 点数の書き換え（align）はせず、該当文を落とす。
 */

const CATEGORY_SCORE_MENTION =
  /(?:身体|心|生活|環境)\s*[はが：:・]?\s*\d{1,3}\s*(?:点|\/\s*100)/u;

const OVERALL_SCORE_MENTION =
  /(?:Sleep\s*Wellness\s*Score|睡眠ウェルネススコア|ウェルネススコア|総合(?:スコア|点)|総合評価)\s*[はが：:・]?\s*\d{1,3}\s*点?/iu;

const AXIS_IN_PARENS =
  /[（(][^）)]*(?:身体|心|生活|環境)\s*\d{1,3}\s*点[^）)]*[）)]/u;

export function profileRelationHasScoreMentions(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    CATEGORY_SCORE_MENTION.test(t) ||
    OVERALL_SCORE_MENTION.test(t) ||
    AXIS_IN_PARENS.test(t)
  );
}

function sentenceHasScoreMention(sentence: string): boolean {
  return profileRelationHasScoreMentions(sentence);
}

/**
 * 4領域点・総合スコアに触れる文を削除する。
 * 全削除になった場合は空文字（呼び出し側でフォールバック）。
 */
export function stripScoreMentionsFromProfileRelation(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (!profileRelationHasScoreMentions(trimmed)) return trimmed;

  const parts = trimmed
    .split(/(?<=[。．！？])/u)
    .map((part) => part.trim())
    .filter(Boolean);

  const kept = parts.filter((part) => !sentenceHasScoreMention(part));
  return kept.join("").trim();
}

export const PROFILE_RELATION_SCORE_SAFE_FALLBACK =
  "今回は測定データと入力のある情報を中心にした参考見解です。スコアの内訳は4領域の欄をご覧ください。";

/** 除去後が空なら安全文へ */
export function sanitizeProfileRelationScores(text: string): string {
  const stripped = stripScoreMentionsFromProfileRelation(text);
  if (stripped) return stripped;
  if (profileRelationHasScoreMentions(text)) {
    return PROFILE_RELATION_SCORE_SAFE_FALLBACK;
  }
  return text.trim();
}
