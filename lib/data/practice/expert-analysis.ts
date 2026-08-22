import { getPrescription } from "@/lib/data/practice/prescriptions";
import type {
  ChallengeTypeId,
  PracticeMetrics,
} from "@/lib/data/practice/types";

/** 画面⑤と同じ配列から、PDF⑤の矛盾ガードに使う最小形 */
export type ExpertAnalysisPriorityItem = {
  title: string;
  reason: string;
  action?: string;
};

export interface ExpertAnalysisTemplate {
  challengeType: ChallengeTypeId;
  paragraphs: string[];
}

const TEMPLATES: Record<ChallengeTypeId, ExpertAnalysisTemplate> = {
  onset: {
    challengeType: "onset",
    paragraphs: [
      "眠りに入るまでに{X}分かかっています。身体は横になっていても、心がまだ一日を手放せずにいた時間です。",
      "活動から眠りへは、本来なだらかな坂道です。その坂を飛ばそうとすると、身体は身構えます。{X}分は、その身構えがほどけるまでの時間でした。",
      "今夜は「眠ろう」とせず、ただ横になって呼吸を見ていてください。眠りは、迎えにいくものではなく、訪れるものです。",
    ],
  },
  midwake: {
    challengeType: "midwake",
    paragraphs: [
      "夜のあいだに{X}分、目が覚めています。眠りが途切れたのではなく、深く沈みきる前に浮かび上がってきた、と考えてみてください。",
      "眠りは一本の線ではなく、寄せては返す波に似ています。浅くなる瞬間そのものは自然なことで、そこから戻れるかどうかが分かれ目になります。",
      "目が覚めても、時計を見ないでいてください。確かめようとした瞬間に、身体は起きる準備を始めてしまいます。",
    ],
  },
  rhythm: {
    challengeType: "rhythm",
    paragraphs: [
      "就寝と起床の時刻に、日ごとのばらつきがあります。身体は毎晩、今日がいつなのかを探すところから始めています。",
      "リズムは意志で作るものではなく、繰り返しのなかに自然と現れるものです。整えるべきは眠る時刻ではなく、目を覚ます時刻のほうです。",
      "明日の朝、決めた時刻に光を浴びてください。夜は、その結果として訪れます。",
    ],
  },
  recovery: {
    challengeType: "recovery",
    paragraphs: [
      "HRVが{X}ms、安静時心拍が{Y}bpm。身体はまだ、日中の構えを解ききれていません。",
      "回復は、何かを足すことでは起こりません。力を抜いた分だけ進むものです。眠っているあいだも身体が働き続けていたとすれば、それは休息ではなく待機の時間でした。",
      "今日は、予定をひとつ減らしてください。何もしない時間こそが、身体の仕事を進めます。",
    ],
  },
  deep: {
    challengeType: "deep",
    paragraphs: [
      "深い睡眠が{X}分。眠ってはいたけれど、いちばん深いところまでは降りきれていない夜でした。",
      "深く眠るには、眠る前に一度、身体を十分に使っておく必要があります。日中に何もしていない身体は、夜にも沈む理由を持ちません。",
      "昼のあいだに、身体を動かす時間をつくってください。夜の深さは、昼の充実の裏返しです。",
    ],
  },
  maintenance: {
    challengeType: "maintenance",
    paragraphs: [
      "睡眠効率{X}%、深い睡眠{Y}分。今の暮らし方が、そのまま眠りに現れています。",
      "良い状態というのは、努力して掴んでいるものではなく、無理をしていないから保たれているものです。変えるべきことは、今はありません。",
      "このまま続けてください。整っている時期にすることは、整えることではなく、崩さないことです。",
    ],
  },
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatSlot(value: number): string {
  return String(Math.round(value));
}

function fillParagraph(
  template: string,
  slots: { X?: number | null; Y?: number | null },
): string | null {
  if (template.includes("{X}") && !isFiniteNumber(slots.X)) return null;
  if (template.includes("{Y}") && !isFiniteNumber(slots.Y)) return null;

  let filled = template;
  if (isFiniteNumber(slots.X)) {
    filled = filled.replaceAll("{X}", formatSlot(slots.X));
  }
  if (isFiniteNumber(slots.Y)) {
    filled = filled.replaceAll("{Y}", formatSlot(slots.Y));
  }
  if (filled.includes("{X}") || filled.includes("{Y}")) return null;
  return filled;
}

function slotsForType(
  challengeType: ChallengeTypeId,
  metrics: PracticeMetrics,
): { X?: number | null; Y?: number | null } {
  switch (challengeType) {
    case "onset":
      return { X: metrics.sleepLatencyMinutes };
    case "midwake":
      return { X: metrics.wakeMinutes };
    case "rhythm":
      return {};
    case "recovery":
      return { X: metrics.hrvMs, Y: metrics.restingHrBpm };
    case "deep":
      return { X: metrics.deepSleepMinutes };
    case "maintenance":
      return {
        X: metrics.sleepEfficiencyPercent,
        Y: metrics.deepSleepMinutes,
      };
  }
}

function fillTemplate(
  challengeType: ChallengeTypeId,
  metrics: PracticeMetrics,
): string[] {
  const template = TEMPLATES[challengeType];
  const slots = slotsForType(challengeType, metrics);
  const paragraphs = template.paragraphs
    .map((paragraph) => fillParagraph(paragraph, slots))
    .filter((paragraph): paragraph is string => Boolean(paragraph));
  if (paragraphs.length < 2) return [];
  return paragraphs;
}

function challengeMatchesPriority(
  challengeType: ChallengeTypeId,
  item: ExpertAnalysisPriorityItem,
): boolean {
  const text = `${item.title} ${item.reason} ${item.action ?? ""}`;
  switch (challengeType) {
    case "onset":
      return /入眠|潜時|寝つき/.test(text);
    case "midwake":
      return /覚醒|睡眠効率|中途/.test(text);
    case "rhythm":
      return /体内時計|リズム|就寝時刻|起床時刻/.test(text);
    case "recovery":
      return /HRV|心拍|自律|ストレス/.test(text);
    case "deep":
      return /深い睡眠|深睡眠/.test(text);
    case "maintenance":
      return false;
  }
}

function asSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return /[。．!?！？]$/.test(t) ? t : `${t}。`;
}

function closingFromPriority(item: ExpertAnalysisPriorityItem): string {
  const action = (item.action ?? "").trim();
  if (action) {
    if (/ください[。．]?$/.test(action) || /です[。．]?$/.test(action)) {
      return asSentence(action);
    }
    return `${action.replace(/[。．]+$/u, "")}ください。`;
  }
  const title = item.title.trim() || "今回いちばん気になるところ";
  return `${title}を、今夜からひとつだけ意識してみてください。`;
}

/** 最優先項目から、既存テンプレに近い語りかけ調の3段落を組み立てる */
function paragraphsFromPriority(item: ExpertAnalysisPriorityItem): string[] {
  const title = item.title.trim() || "今回いちばん整えたいところ";
  const reason = asSentence(item.reason);
  const first = reason || `${title}が、今回いちばん先に見ておきたい状態です。`;
  const second = `今のデータのなかで、いちばん先に整えたいのは「${title}」です。ここが整うと、ほかの指標も追いつきやすくなります。`;
  return [first, second, closingFromPriority(item)];
}

/**
 * 課題タイプ（処方の優先度1位）に対応する定型文を穴埋めして返す。
 * 画面⑤ priorityImprovements があるときは maintenance を使わない。
 * 2段落未満なら空配列（PDFの⑤は非表示）。
 */
export function getExpertAnalysis(
  metrics: PracticeMetrics,
  priorityImprovements?: ExpertAnalysisPriorityItem[] | null,
): string[] {
  const challengeType = getPrescription(metrics).challengeTypes[0];
  const priorities = (priorityImprovements ?? []).filter(
    (item) => item.title.trim() || item.reason.trim(),
  );

  if (priorities.length === 0) {
    return fillTemplate(challengeType, metrics);
  }

  if (
    challengeType !== "maintenance" &&
    challengeMatchesPriority(challengeType, priorities[0]!)
  ) {
    const fromTemplate = fillTemplate(challengeType, metrics);
    if (fromTemplate.length >= 2) return fromTemplate;
  }

  return paragraphsFromPriority(priorities[0]!);
}
