"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import ClientTagsEditor from "@/components/ClientTagsEditor";
import InstructorNav from "@/components/InstructorNav";
import {
  Field,
  GOLD,
  NAVY,
  inputClass,
  textareaClass,
} from "@/components/client-profile/form-ui";
import { createClient } from "@/lib/repositories/client-repository";
import { upsertClientProfile } from "@/lib/repositories/client-profile-repository";

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [memo, setMemo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("氏名は必須です。");
      return;
    }

    setSaving(true);
    try {
      const client = await createClient({
        name: trimmed,
        nameKana: nameKana.trim() || undefined,
        memo: memo.trim() || undefined,
        tags,
        registeredAt: new Date().toISOString().slice(0, 10),
      });

      await upsertClientProfile(client.id, {
        basic: { fullName: trimmed },
      });

      router.push(`/clients/${client.id}/profile`);
    } catch (err) {
      console.error("[NewClientPage] create failed:", err);
      setError(
        err instanceof Error ? err.message : "登録に失敗しました。",
      );
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="NEW CLIENT" />

      <div className="mx-auto max-w-xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            NEW CLIENT
          </p>
          <h1
            className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
            style={{ color: NAVY }}
          >
            新規クライアント登録
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-slate-600">
            氏名のみ必須です。詳細プロフィールは登録後のステップフォームで入力できます。
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-4 rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)] sm:px-8 sm:py-8"
        >
          <Field label="氏名" required>
            <input
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例：山田 太郎"
              autoFocus
              required
            />
          </Field>
          <Field label="ふりがな">
            <input
              className={inputClass}
              value={nameKana}
              onChange={(event) => setNameKana(event.target.value)}
              placeholder="例：やまだ たろう"
            />
          </Field>
          <Field
            label="タグ"
            hint="一覧検索や絞り込みに使えます。自由入力も可能です。"
          >
            <div className="mt-2">
              <ClientTagsEditor
                value={tags}
                onChange={setTags}
                disabled={saving}
                compact
              />
            </div>
          </Field>
          <Field label="担当者メモ">
            <textarea
              rows={3}
              className={textareaClass}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="フォロー上の注意点など"
            />
          </Field>

          {error && (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Link
              href="/clients"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-[15px] font-semibold text-slate-600"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 text-[15px] font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: NAVY }}
            >
              {saving ? "登録中..." : "登録してプロフィールへ"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
