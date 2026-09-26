"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminShell from "@/components/AdminShell";
import MelatoninYogaSessionForm from "@/components/melatonin-yoga/MelatoninYogaSessionForm";
import {
  emptySessionFormState,
  formStateToSessionInput,
} from "@/lib/melatonin-yoga/format";
import type { MelatoninYogaSessionFormState } from "@/lib/melatonin-yoga/types";

export default function AdminNewMelatoninYogaSessionPage() {
  const router = useRouter();
  const [form, setForm] = useState<MelatoninYogaSessionFormState>(
    emptySessionFormState(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const converted = formStateToSessionInput(form);
    if (!converted.ok) {
      setError(converted.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/melatonin-yoga/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: converted.input }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "登録に失敗しました");
      router.push("/admin/melatonin-yoga");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="開催日程を登録"
      description="メラトニンヨガ™ の相談会・ワークショップ・養成コースの日程を登録します。日時は日本時間で入力してください。"
    >
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <MelatoninYogaSessionForm
        value={form}
        onChange={setForm}
        saving={saving}
        submitLabel="登録する"
        onSubmit={() => void save()}
      />
    </AdminShell>
  );
}
