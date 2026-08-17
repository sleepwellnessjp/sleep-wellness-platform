"use client";

import { useState } from "react";
import {
  emptyBlock,
  SLEEP_CONTENT_BLOCK_TYPE_LABELS,
  SLEEP_CONTENT_BLOCK_TYPES,
  type SleepContentBlock,
  type SleepContentBlockType,
} from "@/lib/sleep-content/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#8a6a2d] focus:ring-4 focus:ring-[#8a6a2d]/15";
const labelClass = "text-sm font-semibold text-[#071426]";
const actionClass =
  "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#071426] disabled:opacity-40";

const FIGURE_LINE = /^\[図(\d+)[：:](.+)\]$/;
const CALLOUT_LINE = /^\*\*([^*]+)\*\*$/;

function isIgnoredLine(trimmed: string): boolean {
  return trimmed === "---" || trimmed === "#" || trimmed.startsWith("# ");
}

function isHeadingLine(trimmed: string): boolean {
  return trimmed.startsWith("## ");
}

function isListLine(trimmed: string): boolean {
  return trimmed.startsWith("- ");
}

function figureFromLine(trimmed: string): SleepContentBlock | null {
  const match = trimmed.match(FIGURE_LINE);
  if (!match) return null;
  const number = match[1] ?? "";
  const description = (match[2] ?? "").trim();
  return {
    type: "figure",
    image_url: "",
    alt: description,
    caption: `図${number}　${description}`,
  };
}

function isCalloutLine(trimmed: string): boolean {
  return CALLOUT_LINE.test(trimmed);
}

function isSpecialLine(trimmed: string): boolean {
  return (
    isIgnoredLine(trimmed) ||
    isHeadingLine(trimmed) ||
    isListLine(trimmed) ||
    figureFromLine(trimmed) !== null ||
    isCalloutLine(trimmed)
  );
}

function blocksFromMarkdown(markdown: string): SleepContentBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: SleepContentBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = (lines[index] ?? "").trim();
    if (trimmed === "" || isIgnoredLine(trimmed)) {
      index += 1;
      continue;
    }
    if (isHeadingLine(trimmed)) {
      blocks.push({ type: "heading", text: trimmed.slice(3).trim() });
      index += 1;
      continue;
    }
    const figure = figureFromLine(trimmed);
    if (figure) {
      blocks.push(figure);
      index += 1;
      continue;
    }
    if (isListLine(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && isListLine((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().slice(2));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }
    const callout = trimmed.match(CALLOUT_LINE);
    if (callout) {
      blocks.push({ type: "callout", text: (callout[1] ?? "").trim() });
      index += 1;
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = (lines[index] ?? "").trim();
      if (current === "") break;
      if (isIgnoredLine(current)) {
        index += 1;
        continue;
      }
      if (isSpecialLine(current)) break;
      paragraphLines.push(current);
      index += 1;
    }
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", text: paragraphLines.join("\n") });
    }
  }

  return blocks;
}

export default function SleepContentBlocksEditor({
  blocks,
  onChange,
  onUploadImage,
}: {
  blocks: SleepContentBlock[];
  onChange: (blocks: SleepContentBlock[]) => void;
  onUploadImage: (file: File) => Promise<string>;
}) {
  const [addType, setAddType] = useState<SleepContentBlockType>("paragraph");
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const updateAt = (index: number, next: SleepContentBlock) => {
    onChange(blocks.map((block, i) => (i === index ? next : block)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const current = next[index];
    const swapped = next[target];
    if (!current || !swapped) return;
    next[index] = swapped;
    next[target] = current;
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const importFromMarkdown = () => {
    const next = blocksFromMarkdown(importText);
    if (next.length === 0) {
      setError("変換できるブロックがありません");
      return;
    }
    if (
      blocks.length > 0 &&
      !window.confirm("既存のブロックを置き換えます。よろしいですか？")
    ) {
      return;
    }
    setError(null);
    onChange(next);
    setImportOpen(false);
  };

  const onPickFigure = async (index: number, file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploadingIndex(index);
    try {
      const url = await onUploadImage(file);
      const current = blocks[index];
      if (!current || current.type !== "figure") return;
      updateAt(index, { ...current, image_url: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className={labelClass}>本文ブロック</p>
      <button
        type="button"
        className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-[#071426]"
        onClick={() => setImportOpen((open) => !open)}
      >
        マークダウンから取り込む
      </button>
      {importOpen ? (
        <div className="space-y-3">
          <label className="block">
            <span className={labelClass}>マークダウン</span>
            <textarea
              className={`${inputClass} min-h-40 resize-y`}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="記事のマークダウンを貼り付けてください"
            />
          </label>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-[#071426]"
            onClick={importFromMarkdown}
          >
            取り込む
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {blocks.length === 0 ? (
        <p className="text-sm text-slate-500">
          ブロックはまだありません。下のボタンから追加できます。
        </p>
      ) : null}

      <ul className="space-y-4">
        {blocks.map((block, index) => (
          <li
            key={`${block.type}-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#8a6a2d]">
                {SLEEP_CONTENT_BLOCK_TYPE_LABELS[block.type]}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={actionClass}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  上へ
                </button>
                <button
                  type="button"
                  className={actionClass}
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                >
                  下へ
                </button>
                <button
                  type="button"
                  className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                  onClick={() => remove(index)}
                >
                  削除
                </button>
              </div>
            </div>

            {block.type === "heading" ? (
              <label className="mt-3 block">
                <span className={labelClass}>見出し</span>
                <input
                  className={inputClass}
                  value={block.text}
                  onChange={(event) =>
                    updateAt(index, { ...block, text: event.target.value })
                  }
                />
              </label>
            ) : null}

            {block.type === "paragraph" ? (
              <label className="mt-3 block">
                <span className={labelClass}>本文</span>
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  value={block.text}
                  onChange={(event) =>
                    updateAt(index, { ...block, text: event.target.value })
                  }
                />
              </label>
            ) : null}

            {block.type === "callout" ? (
              <label className="mt-3 block">
                <span className={labelClass}>強調テキスト</span>
                <textarea
                  className={`${inputClass} min-h-24 resize-y`}
                  value={block.text}
                  onChange={(event) =>
                    updateAt(index, { ...block, text: event.target.value })
                  }
                />
              </label>
            ) : null}

            {block.type === "list" ? (
              <label className="mt-3 block">
                <span className={labelClass}>箇条書き（1行＝1項目）</span>
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  value={block.items.join("\n")}
                  onChange={(event) =>
                    updateAt(index, {
                      ...block,
                      items: event.target.value.split("\n"),
                    })
                  }
                />
              </label>
            ) : null}

            {block.type === "figure" ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className={labelClass}>図解画像</p>
                  <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#8a6a2d]/40 bg-[#fbf9f4] px-4 py-4 text-sm font-semibold text-[#8a6a2d]">
                    画像を選択
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg"
                      className="sr-only"
                      onChange={(event) =>
                        void onPickFigure(index, event.target.files?.[0])
                      }
                    />
                  </label>
                  {block.image_url ? (
                    <img
                      src={block.image_url}
                      alt={block.alt || "図解プレビュー"}
                      className="mt-3 max-h-56 w-full rounded-2xl object-contain bg-slate-50"
                    />
                  ) : null}
                  {uploadingIndex === index ? (
                    <p className="mt-2 text-xs text-slate-500">
                      画像を保存しています…
                    </p>
                  ) : null}
                </div>
                <label className="block">
                  <span className={labelClass}>代替テキスト</span>
                  <input
                    className={inputClass}
                    value={block.alt}
                    onChange={(event) =>
                      updateAt(index, { ...block, alt: event.target.value })
                    }
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>キャプション</span>
                  <input
                    className={inputClass}
                    value={block.caption}
                    onChange={(event) =>
                      updateAt(index, { ...block, caption: event.target.value })
                    }
                  />
                </label>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className={labelClass}>追加するブロック</span>
          <select
            className={inputClass}
            value={addType}
            onChange={(event) =>
              setAddType(event.target.value as SleepContentBlockType)
            }
          >
            {SLEEP_CONTENT_BLOCK_TYPES.map((type) => (
              <option key={type} value={type}>
                {SLEEP_CONTENT_BLOCK_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-[#071426]"
          onClick={() => onChange([...blocks, emptyBlock(addType)])}
        >
          ブロックを追加
        </button>
      </div>
    </div>
  );
}
