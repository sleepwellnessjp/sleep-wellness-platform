"use client";

import Image from "next/image";
import { FormEvent, useMemo, useRef, useState } from "react";
import ActivityDetailView from "@/components/instructor-activities/ActivityDetailView";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { composeLocation, splitLocation, toTimeInputValue } from "@/lib/instructor-activities/format";
import { prepareActivityImage } from "@/lib/instructor-activities/image";
import type {
  AssignableInstructorOption,
  InstructorActivity,
  InstructorActivityInput,
  InstructorActivityStatus,
} from "@/lib/instructor-activities/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#8a6a2d] focus:ring-4 focus:ring-[#8a6a2d]/15";
const labelClass = "text-sm font-semibold text-[#071426]";

type FormState = InstructorActivityInput;

function emptyForm(): FormState {
  return {
    title: "",
    imageUrl: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    location: "",
    region: "",
    venue: "",
    isOnline: false,
    summary: "",
    description: "",
    target: "",
    capacity: "",
    price: "",
    applicationUrl: "",
    applicationMethod: "",
    notes: "",
    featured: false,
    instructorId: "",
  };
}

function fromActivity(activity: InstructorActivity): FormState {
  const split = splitLocation(activity.location);
  return {
    title: activity.title,
    imageUrl: activity.imageUrl,
    eventDate: activity.eventDate,
    startTime: toTimeInputValue(activity.startTime),
    endTime: toTimeInputValue(activity.endTime),
    location: activity.location,
    region: split.region,
    venue: split.venue,
    isOnline: activity.isOnline,
    summary: activity.summary,
    description: activity.description,
    target: activity.target,
    capacity: activity.capacity,
    price: activity.price,
    applicationUrl: activity.applicationUrl,
    applicationMethod: activity.applicationMethod,
    notes: activity.notes,
    featured: activity.featured,
    instructorId: activity.instructorId,
  };
}

export default function ActivityForm({
  instructorName,
  instructorOptions,
  showFeatured = false,
  initial,
  submitLabel,
  draftLabel = "下書き保存",
  onSubmit,
}: {
  instructorName: string;
  instructorOptions?: AssignableInstructorOption[];
  showFeatured?: boolean;
  initial?: InstructorActivity | null;
  submitLabel: string;
  draftLabel?: string;
  onSubmit: (
    activity: InstructorActivityInput,
    status: InstructorActivityStatus,
  ) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    initial ? fromActivity(initial) : emptyForm(),
  );
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const displayImage = localPreview || form.imageUrl;
  const selectedInstructor =
    instructorOptions?.find((item) => item.id === form.instructorId) ?? null;
  const displayInstructorName = selectedInstructor?.name || instructorName;

  const previewActivity = useMemo<InstructorActivity>(
    () => ({
      id: initial?.id ?? "preview",
      slug: initial?.slug ?? "preview",
      instructorId: form.instructorId || initial?.instructorId || "",
      createdBy: initial?.createdBy ?? "",
      title: form.title || "イベントタイトル",
      imageUrl: displayImage,
      eventDate: form.eventDate,
      startTime: form.startTime ?? "",
      endTime: form.endTime ?? "",
      location: composeLocation(form.region, form.venue) || form.location || "",
      isOnline: Boolean(form.isOnline),
      summary: form.summary,
      description: form.description ?? "",
      target: form.target ?? "",
      capacity: form.capacity ?? "",
      price: form.price ?? "",
      applicationUrl: form.applicationUrl ?? "",
      applicationMethod: form.applicationMethod ?? "",
      notes: form.notes ?? "",
      instructorName: displayInstructorName,
      instructorHeadline: initial?.instructorHeadline ?? "",
      instructorBio: initial?.instructorBio ?? "",
      instructorProfileImageUrl: initial?.instructorProfileImageUrl ?? "",
      instructorPublicId: form.instructorId || initial?.instructorPublicId || "",
      status: "draft",
      published: false,
      featured: Boolean(form.featured),
      approvalStatus: "auto_approved",
      createdAt: "",
      updatedAt: "",
    }),
    [displayImage, displayInstructorName, form, initial],
  );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return objectUrl;
    });
    setUploading(true);
    try {
      const prepared = await prepareActivityImage(file);
      const body = new FormData();
      body.append(
        "file",
        new File([prepared.blob], prepared.fileName, { type: prepared.mimeType }),
      );
      const response = await fetch("/api/instructor/activities/image", {
        method: "POST",
        body,
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        throw new Error(json.error ?? "画像のアップロードに失敗しました");
      }
      setField("imageUrl", json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像の処理に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const save = async (status: InstructorActivityStatus) => {
    if (!formRef.current?.reportValidity()) return;
    if (!form.imageUrl) {
      setError("メイン画像を登録してください");
      return;
    }
    if (instructorOptions && instructorOptions.length > 0 && !form.instructorId) {
      setError("担当認定インストラクターを選択してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        {
          ...form,
          location: composeLocation(form.region, form.venue) || form.location,
        },
        status,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save("published");
  };

  return (
    <form ref={formRef} onSubmit={onFormSubmit} className="space-y-5">
      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className={labelClass}>イベントタイトル（必須）</span>
        <input
          className={inputClass}
          value={form.title}
          onChange={(event) => setField("title", event.target.value)}
          required
        />
      </label>

      {instructorOptions ? (
        <label className="block">
          <span className={labelClass}>担当認定インストラクター（必須）</span>
          <select
            className={inputClass}
            value={form.instructorId ?? ""}
            onChange={(event) => setField("instructorId", event.target.value)}
            required
          >
            <option value="">認定講師を選択してください</option>
            {instructorOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.email ? `（${item.email}）` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm text-slate-500">担当講師：{displayInstructorName}</p>
      )}

      <div>
        <p className={labelClass}>メイン画像（必須）</p>
        <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#8a6a2d]/40 bg-[#fbf9f4] px-4 py-4 text-sm font-semibold text-[#8a6a2d]">
          画像を選択
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(event) => void onPickImage(event.target.files?.[0])}
          />
        </label>
        {displayImage ? (
          <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-2xl bg-[#071426]/08">
            {displayImage.startsWith("blob:") ? (
              // 選択直後のローカルプレビュー（next/image は blob URL 非対応）
              <img
                src={displayImage}
                alt="プレビュー"
                className="h-full w-full object-cover"
              />
            ) : (
              <Image src={displayImage} alt="プレビュー" fill className="object-cover" />
            )}
          </div>
        ) : null}
        {uploading ? (
          <p className="mt-2 text-xs text-slate-500">画像を保存しています…（プレビューは表示中）</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className={labelClass}>開催日（必須）</span>
          <input
            type="date"
            className={inputClass}
            value={form.eventDate}
            onChange={(event) => setField("eventDate", event.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className={labelClass}>開始時間（必須）</span>
          <input
            type="time"
            className={inputClass}
            value={form.startTime ?? ""}
            onChange={(event) => setField("startTime", event.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className={labelClass}>終了時間（必須）</span>
          <input
            type="time"
            className={inputClass}
            value={form.endTime ?? ""}
            onChange={(event) => setField("endTime", event.target.value)}
            required
          />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className={labelClass}>開催形式（必須）</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
            <input
              type="radio"
              name="event-format"
              checked={!form.isOnline}
              onChange={() => setField("isOnline", false)}
            />
            <span className="text-sm font-semibold text-[#071426]">会場開催</span>
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
            <input
              type="radio"
              name="event-format"
              checked={Boolean(form.isOnline)}
              onChange={() => setField("isOnline", true)}
            />
            <span className="text-sm font-semibold text-[#071426]">オンライン</span>
          </label>
        </div>
      </fieldset>

      <label className="block">
        <span className={labelClass}>
          {form.isOnline ? "開催地域（任意）" : "開催地域（必須）"}
        </span>
        <input
          className={inputClass}
          value={form.region ?? ""}
          onChange={(event) => setField("region", event.target.value)}
          placeholder="東京都、オンライン配信 など"
          required={!form.isOnline}
        />
      </label>

      <label className="block">
        <span className={labelClass}>
          {form.isOnline ? "参加方法・会場名（任意）" : "会場名（任意）"}
        </span>
        <input
          className={inputClass}
          value={form.venue ?? ""}
          onChange={(event) => setField("venue", event.target.value)}
          placeholder={form.isOnline ? "Zoom など" : "スタジオ名・施設名"}
        />
      </label>

      <label className="block">
        <span className={labelClass}>イベント概要（必須）</span>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          value={form.summary}
          onChange={(event) => setField("summary", event.target.value)}
          required
        />
      </label>

      <label className="block">
        <span className={labelClass}>詳細説明（任意）</span>
        <textarea
          className={`${inputClass} min-h-32 resize-y`}
          value={form.description ?? ""}
          onChange={(event) => setField("description", event.target.value)}
        />
      </label>

      <label className="block">
        <span className={labelClass}>対象者（任意）</span>
        <input
          className={inputClass}
          value={form.target ?? ""}
          onChange={(event) => setField("target", event.target.value)}
        />
      </label>
      <label className="block">
        <span className={labelClass}>定員（任意）</span>
        <input
          className={inputClass}
          value={form.capacity ?? ""}
          onChange={(event) => setField("capacity", event.target.value)}
        />
      </label>
      <label className="block">
        <span className={labelClass}>参加料金（任意）</span>
        <input
          className={inputClass}
          value={form.price ?? ""}
          onChange={(event) => setField("price", event.target.value)}
        />
      </label>
      <label className="block">
        <span className={labelClass}>申込URL（任意）</span>
        <input
          className={inputClass}
          value={form.applicationUrl ?? ""}
          onChange={(event) => setField("applicationUrl", event.target.value)}
          inputMode="url"
        />
      </label>
      <label className="block">
        <span className={labelClass}>申込方法（任意）</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={form.applicationMethod ?? ""}
          onChange={(event) => setField("applicationMethod", event.target.value)}
        />
      </label>
      <label className="block">
        <span className={labelClass}>補足事項（任意）</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={form.notes ?? ""}
          onChange={(event) => setField("notes", event.target.value)}
        />
      </label>

      {showFeatured ? (
        <label className="flex min-h-12 items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={Boolean(form.featured)}
            onChange={(event) => setField("featured", event.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-[#071426]">
              トップページ掲載
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              ONにすると、公開中かつ開催前のイベントがトップページの「認定インストラクター関連情報」に優先表示されます。
            </span>
          </span>
        </label>
      ) : null}

      {showPreview ? (
        <div className="rounded-[28px] border border-[#071426]/10 bg-[#f7f7f5] px-4 py-6 sm:px-6">
          <p
            className="mb-4 text-[11px] font-semibold tracking-[0.18em]"
            style={{ color: GOLD }}
          >
            PREVIEW
          </p>
          <ActivityDetailView activity={previewActivity} showBack={false} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => setShowPreview((value) => !value)}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold"
          style={{ color: NAVY }}
        >
          {showPreview ? "プレビューを閉じる" : "プレビュー"}
        </button>
        <button
          type="button"
          disabled={saving || uploading}
          onClick={() => void save("draft")}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold disabled:opacity-60"
          style={{ color: NAVY }}
        >
          {draftLabel}
        </button>
        <button
          type="submit"
          disabled={saving || uploading}
          className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: NAVY }}
        >
          {saving ? "保存中…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
