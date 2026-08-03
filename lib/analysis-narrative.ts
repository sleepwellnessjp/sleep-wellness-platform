/**
 * AI分析ナラティブの後処理。
 * - 「ノンレム」表現の除去
 * - 同一実測フレーズの重複抑制
 */

/** 表示・AIコメントから「ノンレム」を除去し、深い睡眠系へ寄せる */
export function stripNonRemWording(text: string): string {
  if (!text) return text;
  return text
    .replace(/ノンレム睡眠率/g, "深い睡眠率")
    .replace(/ノンレム率/g, "深い睡眠率")
    .replace(/ノンレム睡眠時間/g, "深い睡眠")
    .replace(/ノンレム時間/g, "深い睡眠")
    .replace(/ノンレム睡眠/g, "深い睡眠")
    .replace(/ノンレム/g, "深い睡眠")
    .replace(/深い睡眠深い睡眠/g, "深い睡眠")
    .replace(/深い睡眠率率/g, "深い睡眠率");
}

const METRIC_PHRASE =
  /(?:睡眠時間|深い睡眠|浅い睡眠|レム睡眠|REM睡眠|睡眠効率|入眠潜時|覚醒時間|HRV|SpO₂|SpO2|ストレス|呼吸(?:速度|数)|安静時心拍(?:数)?|体内時計)\s*[：:]?\s*(?:[-+]?\d+(?:[.:：]\d+)?(?:\s*(?:時間|分|%|％|ms|bpm|rpm|回\/分))?)+/gi;

/**
 * 複数フィールドを通し、同じ実測フレーズの再掲を抑制する。
 * 2回目以降は指標名のみ（数値なし）に短縮。
 */
export function dedupeMetricPhrasesAcrossFields(
  fields: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  return fields.map((raw) => {
    if (!raw) return "";
    let text = stripNonRemWording(raw);
    text = text.replace(METRIC_PHRASE, (match) => {
      const key = match.replace(/\s+/g, "").toLowerCase();
      if (seen.has(key)) {
        const label = match.replace(
          /\s*(?:[-+]?\d+(?:[.:：]\d+)?(?:\s*(?:時間|分|%|％|ms|bpm|rpm|回\/分))?)+$/i,
          "",
        );
        return label.trim() || match;
      }
      seen.add(key);
      return match;
    });
    return text;
  });
}

export function sanitizeAnalysisNarratives(record: Record<string, unknown>): void {
  const stringFields = [
    "summary",
    "karteSummary",
    "scoreComment",
    "profileRelation",
    "lifestyleRelation",
  ] as const;

  for (const key of stringFields) {
    const value = record[key];
    if (typeof value === "string") {
      record[key] = stripNonRemWording(value);
    }
  }

  const summary = typeof record.summary === "string" ? record.summary : "";
  const karte =
    typeof record.karteSummary === "string" ? record.karteSummary : "";
  const scoreComment =
    typeof record.scoreComment === "string" ? record.scoreComment : "";
  const [s1, s2, s3] = dedupeMetricPhrasesAcrossFields([
    summary,
    karte,
    scoreComment,
  ]);
  if (typeof record.summary === "string") record.summary = s1;
  if (typeof record.karteSummary === "string") record.karteSummary = s2;
  if (typeof record.scoreComment === "string") record.scoreComment = s3;

  if (Array.isArray(record.goodPoints)) {
    record.goodPoints = record.goodPoints.map((item) =>
      typeof item === "string" ? stripNonRemWording(item) : item,
    );
  }

  if (Array.isArray(record.todaysRecommendations)) {
    record.todaysRecommendations = record.todaysRecommendations.map((item) =>
      typeof item === "string" ? stripNonRemWording(item) : item,
    );
  }

  if (Array.isArray(record.nextComparisonPoints)) {
    record.nextComparisonPoints = record.nextComparisonPoints.map((item) =>
      typeof item === "string" ? stripNonRemWording(item) : item,
    );
  }

  if (Array.isArray(record.improvements)) {
    record.improvements = record.improvements.map((item) => {
      if (!item || typeof item !== "object") return item;
      const row = item as Record<string, unknown>;
      if (typeof row.text === "string") row.text = stripNonRemWording(row.text);
      if (typeof row.whyNow === "string") {
        row.whyNow = stripNonRemWording(row.whyNow);
      }
      return row;
    });
  }

  if (record.categoryScoreRationales && typeof record.categoryScoreRationales === "object") {
    const rationales = record.categoryScoreRationales as Record<string, unknown>;
    for (const key of ["body", "mind", "lifestyle", "environment"] as const) {
      if (typeof rationales[key] === "string") {
        rationales[key] = stripNonRemWording(rationales[key] as string);
      }
    }
  }

  if (record.instructorCounseling && typeof record.instructorCounseling === "object") {
    const counseling = record.instructorCounseling as Record<string, unknown>;
    for (const [key, value] of Object.entries(counseling)) {
      if (typeof value === "string") {
        counseling[key] = stripNonRemWording(value);
      } else if (Array.isArray(value)) {
        counseling[key] = value.map((item) =>
          typeof item === "string" ? stripNonRemWording(item) : item,
        );
      }
    }
  }
}
