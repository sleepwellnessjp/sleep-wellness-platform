"use client";

import { OURA_MAX_IMAGES } from "@/lib/oura-vision-runner";

type OuraImageQueueProps = {
  files: File[];
  onChange: (files: File[]) => void;
  showMissing?: boolean;
};

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (!item) return items;
  next.splice(to, 0, item);
  return next;
}

/**
 * Oura 複数画像キュー: 追加・削除・上下並び替え。
 * 枚数は固定せず、安全上限のみ適用する。
 */
export default function OuraImageQueue({
  files,
  onChange,
  showMissing = false,
}: OuraImageQueueProps) {
  return (
    <div className="space-y-4">
      <input
        id="oura-multi-upload"
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          onChange([...files, ...selected].slice(0, OURA_MAX_IMAGES));
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="oura-multi-upload"
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#315f68]/25 bg-white px-4 py-3 text-[14px] font-semibold text-[#071426] transition hover:border-[#315f68]/45 hover:bg-[#f4f7f7] sm:text-sm"
        >
          {files.length === 0 ? "画像を選択（複数可）" : "画像を追加"}
        </label>
        {files.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-[13px] font-semibold text-slate-500 transition hover:text-[#071426] sm:text-sm"
          >
            すべて削除
          </button>
        )}
      </div>
      <p className="text-[13px] text-slate-500">
        {files.length} 枚選択中
        {files.length > 0
          ? `（上限 ${OURA_MAX_IMAGES} 枚・枚数は固定しません）`
          : `（上限 ${OURA_MAX_IMAGES} 枚）`}
      </p>
      {showMissing && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
          Oura画像を1枚以上選択してください
        </p>
      )}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#fafaf8] px-3 py-2.5 text-[13px] text-slate-700"
            >
              <span className="min-w-0 truncate">
                {index + 1}. {file.name}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-500 transition hover:bg-white hover:text-[#071426] disabled:opacity-30"
                  disabled={index === 0}
                  aria-label="上へ移動"
                  onClick={() => onChange(moveItem(files, index, index - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-500 transition hover:bg-white hover:text-[#071426] disabled:opacity-30"
                  disabled={index === files.length - 1}
                  aria-label="下へ移動"
                  onClick={() => onChange(moveItem(files, index, index + 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-500 transition hover:bg-white hover:text-[#071426]"
                  onClick={() =>
                    onChange(files.filter((_, i) => i !== index))
                  }
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
