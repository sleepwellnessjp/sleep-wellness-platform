import {
  MELATONIN_YOGA_EVENT_TYPES,
  MELATONIN_YOGA_TRAINING_FORMATS,
  type MelatoninYogaEventType,
} from "@/lib/melatonin-yoga/types";
import type { MelatoninYogaRegistrationInput } from "@/lib/melatonin-yoga/registration-types";

const KANA_NAME = /^[ぁ-んァ-ヶー・\s　]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEventType(value: string): value is MelatoninYogaEventType {
  return (MELATONIN_YOGA_EVENT_TYPES as readonly string[]).includes(value);
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "127.0.0.1";
}

export function validateMelatoninYogaRegistration(
  raw: unknown,
): { ok: true; value: MelatoninYogaRegistrationInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "入力内容を確認してください" };
  }

  const body = raw as Record<string, unknown>;
  const nameKanji = text(body.nameKanji);
  const nameKana = text(body.nameKana);
  const email = text(body.email).toLowerCase();
  const phone = text(body.phone);
  const message = text(body.message);
  const referralSource = text(body.referralSource);
  const trainingFormatRaw = text(body.trainingFormat);
  const hasYogaExperience = body.hasYogaExperience;

  if (!nameKanji || nameKanji.length > 80) {
    return { ok: false, error: "氏名（漢字）を80文字以内で入力してください" };
  }
  if (!nameKana || nameKana.length > 80 || !KANA_NAME.test(nameKana)) {
    return { ok: false, error: "氏名（かな）をかなで入力してください" };
  }
  if (!EMAIL.test(email) || email.length > 254) {
    return { ok: false, error: "メールアドレスの形式を確認してください" };
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phone.length > 40 || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { ok: false, error: "電話番号を確認してください" };
  }
  if (hasYogaExperience !== true && hasYogaExperience !== false) {
    return { ok: false, error: "ヨガ指導経験の有無を選択してください" };
  }
  if (message.length > 2000) {
    return { ok: false, error: "質問・相談は2000文字以内で入力してください" };
  }
  if (referralSource.length > 200) {
    return { ok: false, error: "きっかけは200文字以内で入力してください" };
  }

  if (!Array.isArray(body.selections) || body.selections.length < 1) {
    return { ok: false, error: "参加希望の種類を1つ以上選択してください" };
  }

  const seenTypes = new Set<MelatoninYogaEventType>();
  const selections: MelatoninYogaRegistrationInput["selections"] = [];
  let needsTrainingFormat = false;

  for (const item of body.selections) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "日程の選択内容を確認してください" };
    }
    const row = item as Record<string, unknown>;
    const eventType = text(row.eventType);
    const isFlexible = row.isFlexible === true;
    const sessionId = text(row.sessionId);

    if (!isEventType(eventType)) {
      return { ok: false, error: "日程の種類を確認してください" };
    }
    if (seenTypes.has(eventType)) {
      return { ok: false, error: "同じ種類を重複して選択できません" };
    }
    seenTypes.add(eventType);

    if (isFlexible) {
      if (sessionId) {
        return { ok: false, error: "日程の選択内容を確認してください" };
      }
      selections.push({ eventType, sessionId: null, isFlexible: true });
    } else {
      if (!sessionId) {
        return { ok: false, error: "日程を選択してください" };
      }
      selections.push({ eventType, sessionId, isFlexible: false });
    }

    if (eventType === "training_course") {
      needsTrainingFormat = true;
    }
  }

  let trainingFormat: string | null = null;
  if (needsTrainingFormat) {
    if (!trainingFormatRaw) {
      return { ok: false, error: "養成コースの受講形式を選択してください" };
    }
    if (
      !(MELATONIN_YOGA_TRAINING_FORMATS as readonly string[]).includes(
        trainingFormatRaw,
      )
    ) {
      return { ok: false, error: "受講形式を確認してください" };
    }
    trainingFormat = trainingFormatRaw;
  } else if (
    trainingFormatRaw &&
    !(MELATONIN_YOGA_TRAINING_FORMATS as readonly string[]).includes(
      trainingFormatRaw,
    )
  ) {
    return { ok: false, error: "受講形式を確認してください" };
  }

  return {
    ok: true,
    value: {
      nameKanji,
      nameKana,
      email,
      phone,
      hasYogaExperience,
      message,
      referralSource,
      trainingFormat,
      selections,
    },
  };
}
