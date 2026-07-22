import type { AcademyQuestion, AcademyTest } from "./types";

export type ScoredAnswer = {
  questionId: string;
  earned: number;
  max: number;
};

export function scoreWrittenAnswer(
  answer: string,
  keywords: string[] | undefined,
  points: number,
): number {
  const text = answer.trim().toLowerCase();
  if (!text) return 0;
  if (!keywords || keywords.length === 0) {
    return text.length >= 8 ? points : Math.round(points * 0.4);
  }
  const hits = keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
  if (hits === 0) return Math.round(points * 0.35);
  if (hits === 1) return Math.round(points * 0.7);
  return points;
}

export function scoreQuestion(
  question: AcademyQuestion,
  answer: string | number | undefined,
): number {
  if (question.kind === "multiple_choice") {
    if (typeof answer !== "number") return 0;
    return answer === question.correctIndex ? question.points : 0;
  }
  return scoreWrittenAnswer(
    typeof answer === "string" ? answer : "",
    question.keywords,
    question.points,
  );
}

export function scoreTestAttempt(
  test: AcademyTest,
  answers: Record<string, string | number>,
): { score: number; maxScore: number; passed: boolean; details: ScoredAnswer[] } {
  const details: ScoredAnswer[] = test.questions.map((q) => {
    const earned = scoreQuestion(q, answers[q.id]);
    return { questionId: q.id, earned, max: q.points };
  });
  const score = details.reduce((sum, d) => sum + d.earned, 0);
  const maxScore = details.reduce((sum, d) => sum + d.max, 0);
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return {
    score: percent,
    maxScore: 100,
    passed: percent >= test.passingScore,
    details,
  };
}

/** SWIJ-YYYY-XXXX 形式の認定番号を生成 */
export function generateCertificateNumber(date = new Date()): string {
  const year = date.getFullYear();
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase()
      : Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SWIJ-${year}-${rand}`;
}

export function addMonthsIso(dateIso: string, months: number): string {
  const d = new Date(`${dateIso}T12:00:00+09:00`);
  d.setMonth(d.getMonth() + months);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayInTokyo(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function daysUntil(targetIso: string, from = new Date()): number {
  const today = todayInTokyo(from);
  const start = new Date(`${today}T00:00:00+09:00`).getTime();
  const end = new Date(`${targetIso}T00:00:00+09:00`).getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

export function formatJaDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}
