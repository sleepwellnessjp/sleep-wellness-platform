"use client";

import Image from "next/image";
import type {
  WearableImageCategory,
  WearableRequiredImageSpec,
  WearableUploadedImage,
} from "@/lib/wearable-analysis";
import { formatConfidencePercent } from "@/lib/wearable-classify";

type UploadedImageCardProps = {
  image: WearableUploadedImage;
  label: string;
  onRemove: () => void;
  onReplace: (file: File) => void;
  replaceInputId: string;
  /** unknown のみ: 手動でカテゴリを選ぶ */
  categoryOptions?: readonly WearableRequiredImageSpec[];
  onAssignCategory?: (category: WearableImageCategory) => void;
};

function statusBadge(image: WearableUploadedImage): {
  text: string;
  className: string;
} | null {
  const conf = formatConfidencePercent(image.confidence);
  if (image.status === "candidate") {
    return {
      text: `候補 ${conf}`,
      className: "bg-[#fffbeb] text-amber-800 border-amber-200",
    };
  }
  if (image.status === "assigned" || image.status === "ready") {
    if (image.confidence != null) {
      return {
        text: `自動 ${conf}`,
        className: "bg-[#315f68]/12 text-[#315f68] border-[#315f68]/20",
      };
    }
    return {
      text: "登録済",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }
  if (image.status === "needs_manual") {
    return {
      text: conf === "—" ? "要手動" : `要手動 ${conf}`,
      className: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  if (image.status === "classifying") {
    return {
      text: "分類中…",
      className: "bg-slate-100 text-slate-500 border-slate-200",
    };
  }
  return null;
}

export default function UploadedImageCard({
  image,
  label,
  onRemove,
  onReplace,
  replaceInputId,
  categoryOptions,
  onAssignCategory,
}: UploadedImageCardProps) {
  const badge = statusBadge(image);
  const showManualSelect =
    image.status === "needs_manual" || image.imageCategory === "unknown";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative aspect-[9/16] max-h-56 w-full max-w-[180px] bg-[#fafaf8]">
        <Image
          src={image.previewUrl}
          alt={label}
          fill
          unoptimized
          className="object-cover"
        />
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <p className="truncate text-[12px] text-slate-600">{image.file.name}</p>
        {badge ? (
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
          >
            {badge.text}
          </span>
        ) : null}

        {showManualSelect && categoryOptions && onAssignCategory ? (
          <label className="block">
            <span className="text-[11px] font-medium text-slate-500">
              画面種類を選択
            </span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-[#fafaf8] px-2 py-2 text-[12px] text-[#071426]"
              defaultValue=""
              onChange={(event) => {
                const value = event.target.value as WearableImageCategory;
                if (value) onAssignCategory(value);
              }}
            >
              <option value="" disabled>
                選択してください
              </option>
              {categoryOptions.map((spec) => (
                <option key={spec.category} value={spec.category}>
                  {spec.label}
                  {spec.required ? "（必須）" : "（任意）"}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <input
            id={replaceInputId}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onReplace(file);
              event.target.value = "";
            }}
          />
          <label
            htmlFor={replaceInputId}
            className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-[#315f68]/25 px-2.5 text-[12px] font-semibold text-[#071426] transition hover:bg-[#f4f7f7]"
          >
            差し替え
          </label>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-[12px] font-semibold text-slate-500 transition hover:text-[#071426]"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
