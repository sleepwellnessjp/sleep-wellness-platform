import { getPrescription } from "@/lib/data/practice/prescriptions";
import type {
  ChallengeTypeId,
  PracticeMetrics,
} from "@/lib/data/practice/types";

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

/**
 * 課題タイプ（処方の優先度1位）に対応する定型文を穴埋めして返す。
 * 2段落未満なら空配列（PDFの⑤は非表示）。
 */
export function getExpertAnalysis(metrics: PracticeMetrics): string[] {
  const challengeType = getPrescription(metrics).challengeTypes[0];
  const template = TEMPLATES[challengeType];
  const slots = slotsForType(challengeType, metrics);
  const paragraphs = template.paragraphs
    .map((paragraph) => fillParagraph(paragraph, slots))
    .filter((paragraph): paragraph is string => Boolean(paragraph));

  if (paragraphs.length < 2) return [];
  return paragraphs;
}
