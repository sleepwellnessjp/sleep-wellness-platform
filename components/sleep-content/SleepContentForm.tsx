"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import SleepContentBlocksEditor from "@/components/sleep-content/SleepContentBlocksEditor";
import { NAVY } from "@/components/ui/tokens";
import {
  isYoutubeKind,
  REST_KINDS,
  SLEEP_CONTENT_CATEGORIES,
  SLEEP_CONTENT_CATEGORY_LABELS,
  SLEEP_CONTENT_KIND_LABELS,
  SLEEP_CONTENT_SUBCATEGORIES,
  SLEEP_CONTENT_SUBCATEGORY_LABELS,
  type SleepContent,
  type SleepContentBlock,
  type SleepContentCategory,
  type SleepContentInput,
  type SleepContentKind,
  type SleepContentStatus,
  type SleepContentSubcategory,
} from "@/lib/sleep-content/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#8a6a2d] focus:ring-4 focus:ring-[#8a6a2d]/15";
const readOnlyClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[16px] text-[#071426]";
const labelClass = "text-sm font-semibold text-[#071426]";

type FormState = {
  slug: string;
  category: SleepContentCategory;
  subcategory: SleepContentSubcategory | "";
  kind: SleepContentKind;
  title: string;
  summary: string;
  bodyBlocks: SleepContentBlock[];
  youtubeUrl: string;
  audioUrl: string;
  coverImageUrl: string;
  durationSeconds: string;
  sortOrder: string;
};

function emptyForm(): FormState {
  return {
    slug: "",
    category: "science",
    subcategory: "basic",
    kind: "article",
    title: "",
    summary: "",
    bodyBlocks: [],
    youtubeUrl: "",
    audioUrl: "",
    coverImageUrl: "",
    durationSeconds: "",
    sortOrder: "0",
  };
}

function fromContent(content: SleepContent): FormState {
  return {
    slug: content.slug,
    category: content.category,
    subcategory: content.subcategory ?? "",
    kind: content.kind,
    title: content.title,
    summary: content.summary,
    bodyBlocks: content.bodyBlocks,
    youtubeUrl: content.youtubeUrl,
    audioUrl: content.audioUrl,
    coverImageUrl: content.coverImageUrl,
    durationSeconds:
      content.durationSeconds == null ? "" : String(content.durationSeconds),
    sortOrder: String(content.sortOrder),
  };
}

function applyCategory(
  category: SleepContentCategory,
  prev: FormState,
): FormState {
  if (category === "science") {
    return {
      ...prev,
      category,
      kind: "article",
      subcategory: prev.subcategory || "basic",
    };
  }
  if (category === "interview") {
    return { ...prev, category, kind: "interview", subcategory: "" };
  }
  const kind = REST_KINDS.includes(prev.kind) ? prev.kind : "talk_video";
  return { ...prev, category, kind, subcategory: "" };
}

function kindOptionsFor(category: SleepContentCategory): SleepContentKind[] {
  if (category === "rest") return REST_KINDS;
  if (category === "interview") return ["interview"];
  return ["article"];
}

export default function SleepContentForm({
  initial,
  slugLocked = false,
  submitLabel,
  draftLabel = "下書き保存",
  onSubmit,
}: {
  initial?: SleepContent | null;
  slugLocked?: boolean;
  submitLabel: string;
  draftLabel?: string;
  onSubmit: (
    content: SleepContentInput,
    status: SleepContentStatus,
  ) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    initial ? fromContent(initial) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioInfo, setAudioInfo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const kindOptions = useMemo(
    () => kindOptionsFor(form.category),
    [form.category],
  );

  const uploadImage = async (file: File): Promise<string> => {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/admin/sleep-content/image", {
      method: "POST",
      body,
    });
    const json = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !json.url) {
      throw new Error(json.error ?? "画像のアップロードに失敗しました");
    }
    return json.url;
  };

  const onPickCover = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setField("coverImageUrl", url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像の処理に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const onPickAudio = async (file: File | undefined) => {
    if (!file) {
      setAudioError("音声ファイルの選択に失敗しました。もう一度お試しください。");
      return;
    }
    setError(null);
    setAudioError(null);
    setAudioInfo(`選択中: ${file.name} (${Math.round(file.size / 1024 / 1024 * 100) / 100}MB)`);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/sleep-content/audio", {
        method: "POST",
        body,
      });
      let json: { url?: string; error?: string } = {};
      try {
        json = (await response.json()) as { url?: string; error?: string };
      } catch {
        json = {
          error: "サーバーから不正な応答を受け取りました。時間をおいて再試行してください。",
        };
      }
      if (!response.ok || !json.url) {
        throw new Error(json.error ?? "音声のアップロードに失敗しました");
      }
      setField("audioUrl", json.url);
      setAudioInfo("アップロード完了");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "音声の処理に失敗しました";
      setError(message);
      setAudioError(message);
      setAudioInfo(null);
    } finally {
      setUploading(false);
    }
  };

  const toInput = (): SleepContentInput => {
    const durationRaw = form.durationSeconds.trim();
    const sortRaw = form.sortOrder.trim();
    return {
      slug: form.slug,
      category: form.category,
      subcategory: form.subcategory || null,
      kind: form.kind,
      title: form.title,
      summary: form.summary,
      bodyBlocks: form.bodyBlocks,
      youtubeUrl: form.youtubeUrl,
      audioUrl: form.audioUrl,
      coverImageUrl: form.coverImageUrl,
      durationSeconds: durationRaw === "" ? null : Number(durationRaw),
      sortOrder: sortRaw === "" ? 0 : Number(sortRaw),
    };
  };

  const save = async (status: SleepContentStatus) => {
    if (!formRef.current?.reportValidity()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(toInput(), status);
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
        <span className={labelClass}>タイトル（必須）</span>
        <input
          className={inputClass}
          value={form.title}
          onChange={(event) => setField("title", event.target.value)}
          required
        />
      </label>

      <label className="block">
        <span className={labelClass}>slug（必須）</span>
        {slugLocked ? (
          <>
            <input className={readOnlyClass} value={form.slug} readOnly />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              公開URLの一部になるため、作成後は変更できません。
            </span>
          </>
        ) : (
          <>
            <input
              className={inputClass}
              value={form.slug}
              onChange={(event) => setField("slug", event.target.value)}
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              title="英小文字・数字・ハイフン"
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              英小文字・数字・ハイフン。例: what-is-melatonin
            </span>
          </>
        )}
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>カテゴリ（必須）</span>
          <select
            className={inputClass}
            value={form.category}
            onChange={(event) =>
              setForm((prev) =>
                applyCategory(
                  event.target.value as SleepContentCategory,
                  prev,
                ),
              )
            }
          >
            {SLEEP_CONTENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {SLEEP_CONTENT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>種別（必須）</span>
          <select
            className={inputClass}
            value={form.kind}
            onChange={(event) =>
              setField("kind", event.target.value as SleepContentKind)
            }
          >
            {kindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {SLEEP_CONTENT_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {form.category === "science" ? (
        <label className="block">
          <span className={labelClass}>サブカテゴリ（必須）</span>
          <select
            className={inputClass}
            value={form.subcategory}
            onChange={(event) =>
              setField(
                "subcategory",
                event.target.value as SleepContentSubcategory,
              )
            }
            required
          >
            {SLEEP_CONTENT_SUBCATEGORIES.map((subcategory) => (
              <option key={subcategory} value={subcategory}>
                {SLEEP_CONTENT_SUBCATEGORY_LABELS[subcategory]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block">
        <span className={labelClass}>概要（任意）</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={form.summary}
          onChange={(event) => setField("summary", event.target.value)}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>並び順</span>
          <input
            className={inputClass}
            type="number"
            value={form.sortOrder}
            onChange={(event) => setField("sortOrder", event.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>尺（秒・任意）</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={form.durationSeconds}
            onChange={(event) => setField("durationSeconds", event.target.value)}
          />
        </label>
      </div>

      <div>
        <p className={labelClass}>カバー画像（任意）</p>
        <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#8a6a2d]/40 bg-[#fbf9f4] px-4 py-4 text-sm font-semibold text-[#8a6a2d]">
          画像を選択
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg"
            className="sr-only"
            onChange={(event) => void onPickCover(event.target.files?.[0])}
          />
        </label>
        {form.coverImageUrl ? (
          <img
            src={form.coverImageUrl}
            alt="カバー画像プレビュー"
            className="mt-3 max-h-56 w-full rounded-2xl object-contain bg-slate-50"
          />
        ) : null}
      </div>

      {isYoutubeKind(form.kind) ? (
        <label className="block">
          <span className={labelClass}>YouTube URL</span>
          <input
            className={inputClass}
            value={form.youtubeUrl}
            onChange={(event) => setField("youtubeUrl", event.target.value)}
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <span className="mt-2 block text-xs leading-5 text-slate-500">
            限定公開の動画URLを入力してください。埋め込みHTMLは保存しません。
          </span>
        </label>
      ) : null}

      {form.kind === "nature_sound" ? (
        <div>
          <p className={labelClass}>自然音（上限 50MB）</p>
          <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#8a6a2d]/40 bg-[#fbf9f4] px-4 py-4 text-sm font-semibold text-[#8a6a2d]">
            音声を選択
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/mp4,audio/wav,audio/ogg,audio/webm,.mp3,.m4a,.wav,.ogg,.webm"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                void onPickAudio(file);
                // 同じファイルを再選択しても onChange が発火するようにする
                event.currentTarget.value = "";
              }}
            />
          </label>
          {audioInfo ? (
            <p className="mt-2 text-xs text-slate-500">{audioInfo}</p>
          ) : null}
          {audioError ? (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {audioError}
            </p>
          ) : null}
          {form.audioUrl ? (
            <p className="mt-2 break-all text-xs text-slate-500">{form.audioUrl}</p>
          ) : null}
        </div>
      ) : null}

      {form.kind === "article" ? (
        <SleepContentBlocksEditor
          blocks={form.bodyBlocks}
          onChange={(bodyBlocks) => setField("bodyBlocks", bodyBlocks)}
          onUploadImage={uploadImage}
        />
      ) : null}

      {uploading ? (
        <p className="text-xs text-slate-500">ファイルを保存しています…</p>
      ) : null}

      <div className="flex flex-col gap-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:flex-row sm:flex-wrap">
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
