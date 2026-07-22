"use client";

import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createClient,
  type CreateClientInput,
} from "@/lib/repositories/client-repository";
import { upsertClientProfile } from "@/lib/repositories/client-profile-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

const textareaClass =
  "mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (clientId: string) => void;
};

type FormState = CreateClientInput;

const emptyForm = (): FormState => ({
  name: "",
  nameKana: "",
  registeredAt: new Date().toISOString().slice(0, 10),
  memo: "",
});

/** 簡易登録モーダル（氏名必須）。詳細は /clients/[id]/profile へ */
export default function NewClientModal({ open, onClose, onCreated }: Props) {
  if (!open) return null;
  return (
    <NewClientModalForm onClose={onClose} onCreated={onCreated} />
  );
}

function NewClientModalForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (clientId: string) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("氏名は必須です。");
      return;
    }

    setSaving(true);
    try {
      const client = await createClient(form);
      await upsertClientProfile(client.id, {
        basic: { fullName: form.name.trim() },
      });
      onCreated?.(client.id);
      onClose();
      router.push(`/clients/${client.id}/profile`);
    } catch (err) {
      console.error("[NewClientModal] createClient failed:", err);
      const message =
        err instanceof Error
          ? err.message
          : err &&
              typeof err === "object" &&
              "message" in err &&
              typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "登録に失敗しました。";
      setError(message || "登録に失敗しました。");
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#071426]/45 px-4 py-6 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_30px_90px_-40px_rgba(7,20,38,0.55)] sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          NEW CLIENT
        </p>
        <h2
          id={titleId}
          className="mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
          style={{ color: NAVY }}
        >
          新規クライアント登録
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          氏名のみ必須です。登録後に詳細プロフィールを入力できます。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold" style={{ color: NAVY }}>
              氏名
              <span
                className="ml-1.5 text-[11px] font-medium"
                style={{ color: GOLD }}
              >
                必須
              </span>
            </span>
            <input
              type="text"
              required
              autoFocus
              className={inputClass}
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="例：山田 太郎"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">ふりがな</span>
            <input
              type="text"
              className={inputClass}
              value={form.nameKana ?? ""}
              onChange={(event) => update("nameKana", event.target.value)}
              placeholder="例：やまだ たろう"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">担当者メモ</span>
            <textarea
              rows={3}
              className={textareaClass}
              value={form.memo ?? ""}
              onChange={(event) => update("memo", event.target.value)}
              placeholder="フォロー上の注意点など"
            />
          </label>

          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: NAVY }}
            >
              {saving ? "登録中..." : "登録してプロフィールへ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
