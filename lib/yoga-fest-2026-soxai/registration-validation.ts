import { isYogaFest2026SoxaiClassId } from "@/lib/yoga-fest-2026-soxai/classes";
import type { YogaFest2026SoxaiRegistrationInput } from "@/lib/yoga-fest-2026-soxai/types";
import {
  isYogaFestSoxaiAgeBand,
  YOGA_FEST_SOXAI_MINOR_AGE_BAND,
} from "@/lib/yoga-fest-2026-soxai/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "127.0.0.1";
}

export function validateYogaFest2026SoxaiRegistration(
  raw: unknown,
): { ok: true; value: YogaFest2026SoxaiRegistrationInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "入力内容を確認してください" };
  }

  const body = raw as Record<string, unknown>;
  const classId = text(body.classId);
  const name = text(body.name);
  const ageBandRaw = text(body.ageBand);
  const email = text(body.email).toLowerCase();
  const guardianName = text(body.guardianName);
  const guardianConsent = body.guardianConsent === true;
  const infoConsent = body.infoConsent === true;

  if (!classId || !isYogaFest2026SoxaiClassId(classId)) {
    return { ok: false, error: "クラスを選択してください" };
  }
  if (!name || name.length > 80) {
    return { ok: false, error: "お名前を80文字以内で入力してください" };
  }
  if (!ageBandRaw || !isYogaFestSoxaiAgeBand(ageBandRaw)) {
    return { ok: false, error: "年代を選択してください" };
  }
  const ageBand = ageBandRaw;
  if (!EMAIL.test(email) || email.length > 254) {
    return { ok: false, error: "メールアドレスの形式を確認してください" };
  }
  if (!infoConsent) {
    return { ok: false, error: "説明内容への同意が必要です" };
  }

  if (ageBand === YOGA_FEST_SOXAI_MINOR_AGE_BAND) {
    if (!guardianName || guardianName.length > 80) {
      return {
        ok: false,
        error: "18歳未満の方は保護者のお名前を入力してください",
      };
    }
    if (!guardianConsent) {
      return {
        ok: false,
        error: "18歳未満の方は保護者の同意が必要です",
      };
    }
  } else if (guardianName || guardianConsent) {
    return {
      ok: false,
      error: "保護者情報は18歳未満の方のみ入力してください",
    };
  }

  return {
    ok: true,
    value: {
      classId,
      name,
      ageBand,
      email,
      guardianName:
        ageBand === YOGA_FEST_SOXAI_MINOR_AGE_BAND ? guardianName : "",
      guardianConsent:
        ageBand === YOGA_FEST_SOXAI_MINOR_AGE_BAND ? guardianConsent : false,
      infoConsent: true,
    },
  };
}
