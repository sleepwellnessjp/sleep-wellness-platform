import { sendEmail } from "@/lib/email/send-email";
import type { MelatoninYogaRegistrationRecord } from "@/lib/melatonin-yoga/registration-types";
import {
  MELATONIN_YOGA_EVENT_TYPE_LABELS,
  MELATONIN_YOGA_EVENT_TYPES,
  MELATONIN_YOGA_SESSION_FORMAT_LABELS,
  MELATONIN_YOGA_TRAINING_FORMAT_LABELS,
  melatoninYogaFeeLabel,
  type MelatoninYogaEventType,
} from "@/lib/melatonin-yoga/types";

const ADMIN_APPLICATIONS_URL = "https://www.swij.jp/admin/melatonin-yoga";

const RECEIPT_SUBJECT = "【SWIJ】メラトニンヨガ™ お申し込みを受け付けました";

const TRAINING_PLATFORM_FEE_NOTE =
  "※Sleep Wellness Platform の年額利用料12,000円は受講料に含まれません";

const JST = "Asia/Tokyo";

function formatEmailTimeJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("ja-JP", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** メール専用: 2026年10月17日（土）10:00〜11:00 */
function formatEmailSessionDayLineJst(
  startsAt: string,
  endsAt: string,
): string {
  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(startDate);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";

  return `${year}年${month}月${day}日（${weekday}）${formatEmailTimeJst(startsAt)}〜${formatEmailTimeJst(endsAt)}`;
}

function formatEmailScheduleLines(
  days: Array<{ startsAt: string; endsAt: string }>,
): string[] {
  if (days.length === 0) return [];
  if (days.length === 1) {
    const day = days[0];
    return [
      `日時：${formatEmailSessionDayLineJst(day.startsAt, day.endsAt)}`,
    ];
  }
  return [
    "日時：",
    ...days.map((day) =>
      formatEmailSessionDayLineJst(day.startsAt, day.endsAt),
    ),
  ];
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function replyToAddress(): string {
  return process.env.EMAIL_REPLY_TO?.trim() ?? "";
}

function formatLocation(format: string, location: string): string {
  const formatLabel =
    MELATONIN_YOGA_SESSION_FORMAT_LABELS[
      format as keyof typeof MELATONIN_YOGA_SESSION_FORMAT_LABELS
    ] ?? format;
  const place = location.trim();
  return place ? `${formatLabel}／${place}` : formatLabel;
}

function selectedEventTypeLabels(
  registration: MelatoninYogaRegistrationRecord,
): string[] {
  const selected = new Set(
    registration.selections.map((item) => item.eventType),
  );
  return MELATONIN_YOGA_EVENT_TYPES.filter((type) => selected.has(type)).map(
    (type) => MELATONIN_YOGA_EVENT_TYPE_LABELS[type],
  );
}

function formatSelectionBlock(
  registration: MelatoninYogaRegistrationRecord,
  eventType: MelatoninYogaEventType,
): string[] {
  const selection = registration.selections.find(
    (item) => item.eventType === eventType,
  );
  if (!selection) return [];

  const label = MELATONIN_YOGA_EVENT_TYPE_LABELS[eventType];
  const lines = [`【${label}】`];

  if (selection.isFlexible) {
    lines.push("日程が合わない・個別相談希望（日程は追ってご案内します）");
    if (eventType === "training_course" && registration.trainingFormat) {
      lines.push(
        `受講形式：${MELATONIN_YOGA_TRAINING_FORMAT_LABELS[registration.trainingFormat]}`,
      );
    }
    return lines;
  }

  lines.push(...formatEmailScheduleLines(selection.sessionDays));
  if (selection.sessionScheduleNote) {
    lines.push(selection.sessionScheduleNote);
  }
  if (eventType === "training_course" && selection.sessionDays.length >= 2) {
    lines.push("※全日程の受講が必要です");
  }
  if (selection.sessionFormat) {
    lines.push(
      `形式・場所：${formatLocation(
        selection.sessionFormat,
        selection.sessionLocation ?? "",
      )}`,
    );
  }
  if (eventType === "training_course" && registration.trainingFormat) {
    lines.push(
      `受講形式：${MELATONIN_YOGA_TRAINING_FORMAT_LABELS[registration.trainingFormat]}`,
    );
  }
  const feeNote = selection.sessionFeeNote?.trim();
  if (feeNote) {
    lines.push(`${melatoninYogaFeeLabel(eventType)}：${feeNote}`);
  }
  if (eventType === "training_course") {
    lines.push(TRAINING_PLATFORM_FEE_NOTE);
  }

  return lines;
}

function selectionBlocksText(
  registration: MelatoninYogaRegistrationRecord,
): string {
  return MELATONIN_YOGA_EVENT_TYPES.map((eventType) =>
    formatSelectionBlock(registration, eventType),
  )
    .filter((block) => block.length > 0)
    .map((block) => block.join("\n"))
    .join("\n\n");
}

function receiptText(registration: MelatoninYogaRegistrationRecord): string {
  const name = oneLine(registration.nameKanji);
  const kana = oneLine(registration.nameKana);
  const selectionBlocks = selectionBlocksText(registration);

  return [
    `${name} 様`,
    "",
    "このたびはメラトニンヨガ™へお申し込みいただき、ありがとうございます。",
    "以下の内容でお申し込みを受け付けました。",
    "",
    "■ お申し込み内容",
    selectionBlocks,
    "",
    "■ お申込者情報",
    `氏名：${name}（${kana}）`,
    `メールアドレス：${registration.email}`,
    `電話番号：${registration.phone}`,
    "",
    "内容を確認のうえ、3営業日以内にご連絡いたします。",
    "お支払い方法や、オンライン参加用のZoomのURLは、その際にご案内します。",
    "「日程が合わない・個別に相談したい」をお選びの方には、日程のご案内をお送りします。",
    "",
    "お申し込み内容の変更・キャンセルは、このメールにご返信ください。",
    "",
    "Sleep Wellness Institute Japan",
    "若林貴久",
  ].join("\n");
}

function notifyText(registration: MelatoninYogaRegistrationRecord): string {
  const name = oneLine(registration.nameKanji);
  const kana = oneLine(registration.nameKana);
  const selectionBlocks = selectionBlocksText(registration);
  const message = registration.message.trim();
  const referral = registration.referralSource?.trim();

  return [
    "新しいお申し込みが届きました。",
    "",
    `氏名：${name}（${kana}）`,
    `メールアドレス：${registration.email}`,
    `電話番号：${registration.phone}`,
    "",
    "■ お申し込み内容",
    selectionBlocks,
    "",
    `ヨガ指導経験：${registration.hasYogaExperience ? "ある" : "ない"}`,
    `質問・相談：${message || "なし"}`,
    `何で知ったか：${referral || "なし"}`,
    "",
    "管理画面で確認する：",
    ADMIN_APPLICATIONS_URL,
  ].join("\n");
}

function notifySubject(registration: MelatoninYogaRegistrationRecord): string {
  const name = oneLine(registration.nameKanji);
  const types = selectedEventTypeLabels(registration);
  const typeSuffix = types.length > 0 ? `（${types.join("・")}）` : "";
  return `【申込】メラトニンヨガ™：${name} 様${typeSuffix}`;
}

/**
 * 申込の保存が成功したあとにだけ呼ぶ（createMelatoninYogaRegistration 内）。
 * 再送は行わない。送信失敗でも例外は出さない。
 */
export async function sendMelatoninYogaRegistrationEmails(
  registration: MelatoninYogaRegistrationRecord,
): Promise<void> {
  const replyTo = replyToAddress();
  const notifySubjectLine = notifySubject(registration);

  try {
    await sendEmail({
      to: registration.email,
      subject: RECEIPT_SUBJECT,
      text: receiptText(registration),
      ...(replyTo ? { replyTo } : {}),
    });
  } catch (error) {
    console.error("[email] melatonin-yoga receipt failed", {
      subject: RECEIPT_SUBJECT,
      error: error instanceof Error ? error.message : "failed",
    });
  }

  if (!replyTo) {
    console.error("[email] melatonin-yoga notify skipped (EMAIL_REPLY_TO unset)", {
      subject: notifySubjectLine,
    });
    return;
  }

  try {
    await sendEmail({
      to: replyTo,
      subject: notifySubjectLine,
      text: notifyText(registration),
      replyTo,
    });
  } catch (error) {
    console.error("[email] melatonin-yoga notify failed", {
      subject: notifySubjectLine,
      error: error instanceof Error ? error.message : "failed",
    });
  }
}
