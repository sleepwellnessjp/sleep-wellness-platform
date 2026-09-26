"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import MelatoninYogaSessionForm from "@/components/melatonin-yoga/MelatoninYogaSessionForm";
import {
  formStateToSessionInput,
  sessionToFormState,
} from "@/lib/melatonin-yoga/format";
import type {
  MelatoninYogaSession,
  MelatoninYogaSessionFormState,
} from "@/lib/melatonin-yoga/types";

export default function AdminEditMelatoninYogaSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<MelatoninYogaSession | null>(null);
  const [form, setForm] = useState<MelatoninYogaSessionFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void fetch(`/api/admin/melatonin-yoga/sessions/${params.id}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        const json = (await response.json()) as {
          session?: MelatoninYogaSession;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        const next = json.session ?? null;
        setSession(next);
        if (next) setForm(sessionToFormState(next));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      });
  }, [params.id]);

  const save = async () => {
    if (!session || !form) return;

    const converted = formStateToSessionInput(form);
    if (!converted.ok) {
      setError(converted.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/melatonin-yoga/sessions/${session.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: converted.input }),
        },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "更新に失敗しました");
      router.push("/admin/melatonin-yoga");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="開催日程を編集"
      description="日時は日本時間で入力してください。"
    >
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {!session && !error ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : null}
      {session && form ? (
        <p className="mb-4 text-sm text-slate-600">
          申込 {session.reservedCount} / 定員 {session.capacity}
        </p>
      ) : null}
      {form ? (
        <MelatoninYogaSessionForm
          value={form}
          onChange={setForm}
          saving={saving}
          submitLabel="保存する"
          onSubmit={() => void save()}
        />
      ) : null}
    </AdminShell>
  );
}
