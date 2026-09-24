import { sendEmail } from "@/lib/email/send-email";
import {
  navigatorCohortLabel,
  type NavigatorApplicationInput,
} from "@/lib/navigator/application-types";

const ADMIN_APPLICATIONS_URL =
  "https://www.swij.jp/admin/navigator-applications";

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function replyToAddress(): string {
  return process.env.EMAIL_REPLY_TO?.trim() ?? "";
}

function receiptText(name: string): string {
  return [
    `${name} 様`,
    "",
    "このたびは睡眠ウェルネスナビゲーターへお申し込みいただき、ありがとうございます。",
    "申請を受け付けました。下記口座へ年額登録料をお振込みください。",
    "",
    "■ 振込先",
    "みずほ銀行 稲荷町支店",
    "普通預金 1464869",
    "ワカバヤシタカヒサ",
    "",
    "年額登録料：12,000円",
    "※振込手数料はご負担ください",
    "※お申し込み時のお名前と振込名義が異なる場合は、このメールにご返信ください",
    "",
    "ご入金を確認後、3営業日以内にご利用開始のご案内をお送りします。",
    "",
    "ご不明な点は、このメールにご返信ください。",
    "",
    "Sleep Wellness Institute Japan",
    "若林貴久",
  ].join("\n");
}

function notifyText(input: NavigatorApplicationInput, name: string): string {
  const lines = [
    "新しい申請が届きました。",
    "",
    `氏名：${name}`,
    `メールアドレス：${input.email}`,
    `受講期：${navigatorCohortLabel(input.cohort)}`,
  ];
  if (input.payerNameKana.trim()) {
    lines.push(`振込名義：${oneLine(input.payerNameKana)}`);
  }
  lines.push("", "管理画面で確認する：", ADMIN_APPLICATIONS_URL);
  return lines.join("\n");
}

/**
 * 申請の保存が成功したあとにだけ呼ぶ。
 * 同じメールアドレスはテーブルの一意制約で再保存できないため、ここは再送されない。
 * 送信失敗でも例外は出さない。
 */
export async function sendNavigatorApplicationReceivedEmails(
  input: NavigatorApplicationInput,
): Promise<void> {
  const name = oneLine(input.nameKanji);
  const replyTo = replyToAddress();
  const receiptSubject =
    "【SWIJ】睡眠ウェルネスナビゲーター申請を受け付けました";
  const notifySubject = `【申請】睡眠ウェルネスナビゲーター：${name} 様`;

  try {
    await sendEmail({
      to: input.email,
      subject: receiptSubject,
      text: receiptText(name),
      ...(replyTo ? { replyTo } : {}),
    });
  } catch (error) {
    console.error("[email] navigator receipt failed", {
      subject: receiptSubject,
      error: error instanceof Error ? error.message : "failed",
    });
  }

  if (!replyTo) {
    console.error("[email] navigator notify skipped (EMAIL_REPLY_TO unset)", {
      subject: notifySubject,
    });
    return;
  }

  try {
    await sendEmail({
      to: replyTo,
      subject: notifySubject,
      text: notifyText(input, name),
      replyTo,
    });
  } catch (error) {
    console.error("[email] navigator notify failed", {
      subject: notifySubject,
      error: error instanceof Error ? error.message : "failed",
    });
  }
}

const REGISTRATION_SUBJECT =
  "【SWIJ】睡眠ウェルネスナビゲーターの登録が完了しました";

function registrationTextNewAccount(name: string): string {
  return [
    `${name} 様`,
    "",
    "ご入金を確認いたしました。睡眠ウェルネスナビゲーターとしての登録が完了しました。",
    "",
    "別途、Sleep Wellness Institute Japan からパスワード設定のご案内メールが届きます。",
    "そちらからパスワードを設定のうえ、ご利用を開始してください。",
    "",
    "※ご案内メールが届かない場合は、迷惑メールフォルダもご確認ください。",
    "見当たらない場合は、このメールにご返信ください。",
    "",
    "Sleep Wellness Institute Japan",
    "若林貴久",
  ].join("\n");
}

function registrationTextExistingAccount(name: string): string {
  return [
    `${name} 様`,
    "",
    "ご入金を確認いたしました。睡眠ウェルネスナビゲーターとしての登録が完了しました。",
    "",
    "これまでお使いのアカウント（このメールアドレス）で、引き続きご利用いただけます。",
    "下記からログインしてください。",
    "https://www.swij.jp",
    "",
    "ログインできない場合は、このメールにご返信ください。",
    "",
    "Sleep Wellness Institute Japan",
    "若林貴久",
  ].join("\n");
}

/**
 * 今回の承認保存で招待結果が sent / existing_account になったときだけ呼ぶ。
 * failed や、すでに確定済みの再保存では呼ばない。送信失敗でも例外は出さない。
 */
export async function sendNavigatorRegistrationCompleteEmail(
  application: { nameKanji: string; email: string },
  kind: "sent" | "existing_account",
): Promise<void> {
  const name = oneLine(application.nameKanji);
  const replyTo = replyToAddress();
  const text =
    kind === "sent"
      ? registrationTextNewAccount(name)
      : registrationTextExistingAccount(name);

  try {
    await sendEmail({
      to: application.email,
      subject: REGISTRATION_SUBJECT,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
  } catch (error) {
    console.error("[email] navigator registration failed", {
      subject: REGISTRATION_SUBJECT,
      kind,
      error: error instanceof Error ? error.message : "failed",
    });
  }
}
