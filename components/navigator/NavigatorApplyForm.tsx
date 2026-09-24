"use client";

import { FormEvent, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { NAVIGATOR_COHORTS } from "@/lib/navigator/application-types";

const inputClass =
  "mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10";

const labelClass = "block text-sm font-semibold text-[#071426]";

export default function NavigatorApplyForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState(false);
  const [feeAgreed, setFeeAgreed] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch("/api/navigator/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameKanji: form.get("nameKanji"),
          nameKana: form.get("nameKana"),
          email: form.get("email"),
          phone: form.get("phone"),
          cohort: form.get("cohort"),
          completionDate: form.get("completionDate"),
          region: form.get("region"),
          teachingStatus: form.get("teachingStatus"),
          motivation: form.get("motivation"),
          activityPlan: form.get("activityPlan"),
          payerNameKana: form.get("payerNameKana"),
          feeAgreed,
          note: form.get("note"),
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "送信できませんでした");
      }
      setReceived(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "送信できませんでした",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (received) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm sm:px-10">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#8a6a2d]">
          RECEIVED
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#071426]">
          申請を受け付けました
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-600">
          内容を確認します。同じメールアドレスでの再申請はできません。
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="space-y-5 rounded-[2rem] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8"
    >
      <Field label="氏名（漢字）" required>
        <input name="nameKanji" required maxLength={80} className={inputClass} autoComplete="name" />
      </Field>
      <Field label="氏名（かな）" required>
        <input name="nameKana" required maxLength={80} className={inputClass} autoComplete="off" />
      </Field>
      <Field label="メールアドレス" required>
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          className={inputClass}
          autoComplete="email"
        />
      </Field>
      <Field label="電話番号" required>
        <input
          name="phone"
          type="tel"
          required
          maxLength={40}
          className={inputClass}
          autoComplete="tel"
        />
      </Field>
      <Field label="受講期" required>
        <select name="cohort" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            選択してください
          </option>
          {NAVIGATOR_COHORTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="修了日" required>
        <input name="completionDate" type="date" required className={inputClass} />
      </Field>
      <Field label="活動地域" required>
        <input name="region" required maxLength={120} className={inputClass} />
      </Field>
      <Field label="現在の指導状況" required>
        <textarea name="teachingStatus" required maxLength={1000} rows={4} className={inputClass} />
      </Field>
      <Field label="志望動機" required>
        <textarea name="motivation" required maxLength={2000} rows={5} className={inputClass} />
      </Field>
      <Field label="活動予定" required>
        <textarea name="activityPlan" required maxLength={2000} rows={4} className={inputClass} />
      </Field>
      <Field
        label="振込名義（カナ）"
        hint="申請者名と異なる場合のみご記入ください"
      >
        <input name="payerNameKana" maxLength={80} className={inputClass} autoComplete="off" />
      </Field>
      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3 text-sm text-[#071426]">
        <input
          type="checkbox"
          checked={feeAgreed}
          onChange={(event) => setFeeAgreed(event.target.checked)}
          className="mt-1 h-4 w-4"
          required
        />
        <span>年額12,000円の登録料に同意します（必須）</span>
      </label>
      <Field label="備考">
        <textarea name="note" maxLength={1000} rows={3} className={inputClass} />
      </Field>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full sm:w-auto" disabled={submitting || !feeAgreed}>
        {submitting ? "送信しています" : "申請する"}
      </Button>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={labelClass}>
      <span>
        {label}
        {required ? <span className="ml-1 text-rose-700">*</span> : null}
      </span>
      {hint ? <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span> : null}
      {children}
    </label>
  );
}
