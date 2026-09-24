import {
  isNavigatorCohort,
  type NavigatorApplicationInput,
} from "@/lib/navigator/application-types";

const KANA_NAME = /^[ぁ-んァ-ヶー・\s　]+$/;
const PAYER_KANA = /^[ァ-ヶー・･\s　]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function limit(value: string, max: number): boolean {
  return value.length > 0 && value.length <= max;
}

export function validateNavigatorApplication(
  raw: unknown,
): { ok: true; value: NavigatorApplicationInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "入力内容を確認してください" };
  }
  const body = raw as Record<string, unknown>;
  const nameKanji = text(body.nameKanji);
  const nameKana = text(body.nameKana);
  const email = text(body.email).toLowerCase();
  const phone = text(body.phone);
  const cohort = text(body.cohort);
  const completionDate = text(body.completionDate);
  const region = text(body.region);
  const teachingStatus = text(body.teachingStatus);
  const motivation = text(body.motivation);
  const activityPlan = text(body.activityPlan);
  const payerNameKana = text(body.payerNameKana);
  const note = text(body.note);
  const feeAgreed = body.feeAgreed === true;

  if (!limit(nameKanji, 80)) {
    return { ok: false, error: "氏名（漢字）を80文字以内で入力してください" };
  }
  if (!limit(nameKana, 80) || !KANA_NAME.test(nameKana)) {
    return { ok: false, error: "氏名（かな）をかなで入力してください" };
  }
  if (!EMAIL.test(email) || email.length > 254) {
    return { ok: false, error: "メールアドレスの形式を確認してください" };
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phone.length > 40 || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { ok: false, error: "電話番号を確認してください" };
  }
  if (!isNavigatorCohort(cohort)) {
    return { ok: false, error: "受講期を選択してください" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(completionDate)) {
    return { ok: false, error: "修了日を入力してください" };
  }
  const parsed = new Date(`${completionDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || completionDate < "2000-01-01") {
    return { ok: false, error: "修了日を確認してください" };
  }
  if (!limit(region, 120)) {
    return { ok: false, error: "活動地域を120文字以内で入力してください" };
  }
  if (!limit(teachingStatus, 1000)) {
    return { ok: false, error: "現在の指導状況を入力してください" };
  }
  if (!limit(motivation, 2000)) {
    return { ok: false, error: "志望動機を入力してください" };
  }
  if (!limit(activityPlan, 2000)) {
    return { ok: false, error: "活動予定を入力してください" };
  }
  if (payerNameKana.length > 80 || (payerNameKana !== "" && !PAYER_KANA.test(payerNameKana))) {
    return {
      ok: false,
      error: "振込名義はカタカナで入力してください",
    };
  }
  if (!feeAgreed) {
    return { ok: false, error: "年額12,000円の登録料への同意が必要です" };
  }
  if (note.length > 1000) {
    return { ok: false, error: "備考は1000文字以内で入力してください" };
  }

  return {
    ok: true,
    value: {
      nameKanji,
      nameKana,
      email,
      phone,
      cohort,
      completionDate,
      region,
      teachingStatus,
      motivation,
      activityPlan,
      payerNameKana,
      feeAgreed,
      note,
    },
  };
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "127.0.0.1";
}
