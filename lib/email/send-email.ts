/**
 * アプリ共通のメール送信（Resend）。
 * RESEND_API_KEY または EMAIL_FROM が無いときは送らず、サーバーログだけ残す。
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { sent: true; id: string }
  | { sent: false; skipped: true; reason: "missing_config" }
  | { sent: false; skipped: false; error: string };

function readConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

/** 送信に必要な環境変数が両方そろっているか */
export function isEmailDeliveryConfigured(): boolean {
  return readConfig() != null;
}

/**
 * 1通送る。未設定・Resend の失敗でも例外は投げない。
 * ログには宛先と件名だけを残し、本文と API キーは出さない。
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = (Array.isArray(input.to) ? input.to : [input.to])
    .map((address) => address.trim())
    .filter(Boolean);
  const subject = input.subject.trim();

  if (to.length === 0 || !subject || !input.text.trim()) {
    console.error("[email] invalid message", {
      toCount: to.length,
      hasSubject: subject.length > 0,
      hasText: input.text.trim().length > 0,
    });
    return { sent: false, skipped: false, error: "宛先・件名・本文が不足しています" };
  }

  const config = readConfig();
  if (!config) {
    console.info("[email] skipped (RESEND_API_KEY or EMAIL_FROM unset)", {
      to,
      subject,
    });
    return { sent: false, skipped: true, reason: "missing_config" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to,
        subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
        ...(input.replyTo?.trim() ? { reply_to: input.replyTo.trim() } : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      id?: string;
      message?: string;
      name?: string;
    } | null;

    if (!response.ok || !payload?.id) {
      const error =
        payload?.message ||
        payload?.name ||
        `Resend error (${response.status})`;
      console.error("[email] send failed", { to, subject, error });
      return { sent: false, skipped: false, error };
    }

    console.info("[email] sent", { to, subject, id: payload.id });
    return { sent: true, id: payload.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "send failed";
    console.error("[email] send failed", { to, subject, error: message });
    return { sent: false, skipped: false, error: message };
  }
}
