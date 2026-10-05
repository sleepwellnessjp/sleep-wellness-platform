import { sendEmail } from "@/lib/email/send-email";
import { getYogaFest2026SoxaiClass } from "@/lib/yoga-fest-2026-soxai/classes";
import type { YogaFest2026SoxaiRegistrationRecord } from "@/lib/yoga-fest-2026-soxai/types";

const RECEIPT_SUBJECT =
  "【SWIJ】ヨガフェスタ横浜2026 スマートリング検証実験 参加登録を受け付けました";

const JST = "Asia/Tokyo";

function replyToAddress(): string {
  return process.env.EMAIL_REPLY_TO?.trim() ?? "";
}

function formatEmailClassLine(
  teacherName: string,
  classTitle: string,
  startsAt: string,
  endsAt: string,
  room: string,
): string {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(start);

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("ja-JP", {
      timeZone: JST,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return `${teacherName}先生「${classTitle}」／${year}年${month}月${day}日（${weekday}）${formatTime(startsAt)}〜${formatTime(endsAt)}／${room}`;
}

function receiptText(registration: YogaFest2026SoxaiRegistrationRecord): string {
  const session = getYogaFest2026SoxaiClass(registration.classId);
  const name = registration.name.trim();

  return [
    `${name} 様`,
    "",
    "ご参加ありがとうございます。",
    "ヨガフェスタ横浜2026 スマートリング検証実験への参加登録を受け付けました。",
    "",
    "■ 登録したクラス",
    formatEmailClassLine(
      session.teacherName,
      session.classTitle,
      session.startsAt,
      session.endsAt,
      session.room,
    ),
    "",
    "■ 登録したメールアドレス",
    registration.email,
    "（SOXAIアプリに登録したメールアドレスと同じか、ご確認ください）",
    "",
    "■ データの取り扱い",
    "データは個人が特定できない形で分析されます。",
    "",
    "データの削除や登録の取り消しは、このメールへの返信でご連絡ください。",
    "",
    "Sleep Wellness Institute Japan",
  ].join("\n");
}

/** 登録保存成功後のみ。失敗しても例外は出さない（管理者通知は送らない）。 */
export async function sendYogaFestSoxaiRegistrationReceiptEmail(
  registration: YogaFest2026SoxaiRegistrationRecord,
): Promise<void> {
  const replyTo = replyToAddress();

  try {
    await sendEmail({
      to: registration.email,
      subject: RECEIPT_SUBJECT,
      text: receiptText(registration),
      ...(replyTo ? { replyTo } : {}),
    });
  } catch (error) {
    console.error("[email] yoga-fest-soxai receipt failed", {
      subject: RECEIPT_SUBJECT,
      error: error instanceof Error ? error.message : "failed",
    });
  }
}
