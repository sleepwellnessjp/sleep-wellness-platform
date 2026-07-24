"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  PREDEFINED_CLIENT_TAGS,
  clientHasTag,
  normalizeClientTags,
  toggleClientTag,
} from "@/lib/client-tags";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

export function ClientTagChips({
  tags,
  className = "",
  onTagClick,
}: {
  tags: string[];
  className?: string;
  onTagClick?: (tag: string) => void;
}) {
  const normalized = normalizeClientTags(tags);
  if (normalized.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {normalized.map((tag) => {
        const interactive = Boolean(onTagClick);
        return (
          <li key={tag}>
            {interactive ? (
              <button
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="inline-flex min-h-11 items-center rounded-full border border-[#8a6a2d]/25 bg-[#faf7f1] px-3 py-2 text-[11px] font-medium tracking-wide transition active:bg-[#f5efe4] sm:min-h-0 sm:px-2.5 sm:py-1 sm:hover:bg-[#f5efe4] sm:active:bg-[#faf7f1]"
                style={{ color: GOLD }}
              >
                {tag}
              </button>
            ) : (
              <span
                className="inline-flex rounded-full border border-[#8a6a2d]/25 bg-[#faf7f1] px-2.5 py-1 text-[11px] font-medium tracking-wide"
                style={{ color: GOLD }}
              >
                {tag}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type EditorProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  /** compact: 新規登録フォーム向け */
  compact?: boolean;
};

/** プリセット選択 + 自由入力タグエディタ */
export default function ClientTagsEditor({
  value,
  onChange,
  disabled = false,
  compact = false,
}: EditorProps) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const tags = normalizeClientTags(value);

  const commitDraft = () => {
    const next = draft.trim();
    if (!next) return;
    onChange(normalizeClientTags([...tags, next]));
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    }
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap gap-2">
        {PREDEFINED_CLIENT_TAGS.map((tag) => {
          const selected = clientHasTag(tags, tag);
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => onChange(toggleClientTag(tags, tag))}
              aria-pressed={selected}
              className="inline-flex min-h-11 items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition active:opacity-90 disabled:opacity-50 sm:min-h-0 sm:active:opacity-100"
              style={
                selected
                  ? {
                      borderColor: "rgba(138,106,45,0.45)",
                      backgroundColor: "rgba(138,106,45,0.12)",
                      color: GOLD,
                    }
                  : {
                      borderColor: "rgba(15,23,42,0.08)",
                      backgroundColor: "#fafaf8",
                      color: "#64748b",
                    }
              }
            >
              {tag}
            </button>
          );
        })}
      </div>

      <div>
        <label
          htmlFor={inputId}
          className="text-[12px] font-medium text-slate-500"
        >
          自由入力タグ
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={inputId}
            type="text"
            value={draft}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例：シフト制"
            maxLength={32}
            className="min-h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-2.5 text-[16px] text-[#071426] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 disabled:opacity-50 sm:min-h-0 sm:text-[14px]"
          />
          <button
            type="button"
            disabled={disabled || !draft.trim()}
            onClick={commitDraft}
            className="inline-flex min-h-12 shrink-0 items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold transition active:bg-slate-50 disabled:opacity-40 sm:min-h-0 sm:hover:bg-slate-50 sm:active:bg-transparent"
            style={{ color: NAVY }}
          >
            追加
          </button>
        </div>
      </div>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(toggleClientTag(tags, tag))}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#8a6a2d]/30 bg-[#faf7f1] py-2 pr-2.5 pl-3 text-[12px] font-medium transition active:bg-[#f5efe4] disabled:opacity-50 sm:min-h-0 sm:py-1 sm:pr-2 sm:pl-2.5 sm:hover:bg-[#f5efe4] sm:active:bg-[#faf7f1]"
                style={{ color: GOLD }}
                aria-label={`${tag} を削除`}
              >
                {tag}
                <span aria-hidden className="text-[11px] text-[#8a6a2d]/70">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-slate-400">
          プリセットを選ぶか、自由入力で追加できます。
        </p>
      )}
    </div>
  );
}
