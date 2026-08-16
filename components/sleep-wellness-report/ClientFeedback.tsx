"use client";

import { useEffect, useState } from "react";
import { GOLD, NAVY } from "@/components/ui/tokens";

export type ClientFeedbackValue = 1 | 2 | 3 | 4 | 5 | null;

const LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "難しい",
  2: "やや難しい",
  3: "普通",
  4: "できそう",
  5: "すぐできそう",
};

function storageKey(sessionKey: string, itemKey: string) {
  return `swij-swr-client-feedback-v1:${sessionKey}:${itemKey}`;
}

export default function ClientFeedback({
  sessionKey,
  itemKey,
  question = "改善内容は実行できそうですか？",
}: {
  sessionKey: string;
  itemKey: string;
  question?: string;
}) {
  const [value, setValue] = useState<ClientFeedbackValue>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(sessionKey, itemKey));
      const n = raw ? Number(raw) : NaN;
      if (n >= 1 && n <= 5) setValue(n as 1 | 2 | 3 | 4 | 5);
      else setValue(null);
    } catch {
      setValue(null);
    }
  }, [sessionKey, itemKey]);

  const select = (n: 1 | 2 | 3 | 4 | 5) => {
    setValue(n);
    try {
      localStorage.setItem(storageKey(sessionKey, itemKey), String(n));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="swr-client-feedback swr-print-avoid mt-4 rounded-2xl border border-[rgba(7,20,38,0.06)] bg-white/80 px-3.5 py-3">
      <p className="text-[12px] font-medium text-slate-600">{question}</p>
      <div className="no-print mt-2.5 flex flex-wrap items-center gap-1.5">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => select(n)}
            aria-label={`${n}：${LABELS[n]}`}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-[16px] transition"
            style={{
              color: value != null && n <= value ? GOLD : "rgba(7,20,38,0.2)",
            }}
          >
            ★
          </button>
        ))}
      </div>
      <div className="no-print mt-1 flex justify-between gap-2 text-[10px] text-slate-400">
        <span>難しい</span>
        <span>普通</span>
        <span>できそう</span>
      </div>
      <p
        className="swr-feedback-print mt-2 hidden text-[12px] print:block"
        style={{ color: NAVY }}
      >
        本人評価：{" "}
        {value != null
          ? `${"★".repeat(value)}${"☆".repeat(5 - value)}（${LABELS[value]}）`
          : "未選択"}
      </p>
    </div>
  );
}
