"use client";

import { useState } from "react";
import { BORDER, GOLD, MUTED, NAVY } from "@/components/ui/tokens";

type ImportSummary = {
  parsedCount: number;
  insertedCount: number;
  skippedDuplicateCount: number;
  periodStart: string | null;
  periodEnd: string | null;
};

function formatPeriod(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Props = {
  clientId: string;
};

/**
 * FreeStyle Libre CSV をクライアント詳細から取り込む。
 * レポート表示は別ステップ。ここでは保存と件数サマリーのみ。
 */
export default function GlucoseCsvUploadCard({ clientId }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onFileChange(file: File | null) {
    setError(null);
    setSummary(null);
    if (!file) {
      setFileName(null);
      return;
    }
    setFileName(file.name);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/glucose/import`, {
        method: "POST",
        body,
      });
      const json = (await res.json()) as {
        error?: string;
        summary?: ImportSummary;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "取り込みに失敗しました");
      }
      if (!json.summary) {
        throw new Error("取り込み結果を取得できませんでした");
      }
      setSummary(json.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取り込みに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-3xl border bg-white p-5 sm:p-6"
      style={{ borderColor: BORDER }}
    >
      <p
        className="text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        GLUCOSE
      </p>
      <h3
        className="mt-2 text-[15px] font-semibold tracking-[-0.03em] sm:text-base"
        style={{ color: NAVY }}
      >
        血糖CSV（Libre）
      </h3>
      <p className="mt-2 text-[13px] leading-6" style={{ color: MUTED }}>
        FreeStyle Libre の書き出しCSVを取り込みます。同一データの再取り込みは重複しません。
      </p>

      <label className="mt-4 flex min-h-12 cursor-pointer flex-col items-start justify-center gap-1 rounded-2xl border border-dashed px-4 py-3 transition hover:bg-slate-50">
        <span className="text-[13px] font-semibold" style={{ color: NAVY }}>
          {busy ? "取り込み中…" : "CSVファイルを選択"}
        </span>
        <span className="text-[12px]" style={{ color: MUTED }}>
          {fileName ?? "Libre 日本語エクスポート（.csv）"}
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            void onFileChange(next);
            event.target.value = "";
          }}
        />
      </label>

      {error ? (
        <p className="mt-3 text-[13px] leading-6 text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {summary ? (
        <dl className="mt-4 grid gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-[13px] sm:grid-cols-2">
          <div>
            <dt style={{ color: MUTED }}>取込件数（新規）</dt>
            <dd className="font-semibold tabular-nums" style={{ color: NAVY }}>
              {summary.insertedCount} 件
            </dd>
          </div>
          <div>
            <dt style={{ color: MUTED }}>重複スキップ</dt>
            <dd className="font-semibold tabular-nums" style={{ color: NAVY }}>
              {summary.skippedDuplicateCount} 件
            </dd>
          </div>
          <div>
            <dt style={{ color: MUTED }}>パース件数</dt>
            <dd className="font-semibold tabular-nums" style={{ color: NAVY }}>
              {summary.parsedCount} 件
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt style={{ color: MUTED }}>期間</dt>
            <dd className="font-semibold" style={{ color: NAVY }}>
              {formatPeriod(summary.periodStart)}
              {" 〜 "}
              {formatPeriod(summary.periodEnd)}
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
