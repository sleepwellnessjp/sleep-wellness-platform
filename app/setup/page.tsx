"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

type SchemaResponse = {
  tableReady?: boolean;
  platformReady?: boolean;
  persistReady?: boolean;
  instructorIdReady?: boolean;
  instructorColumn?: "instructor_id" | "owner_id" | null;
  missingTable?: boolean;
  probeError?: string | null;
  probeCode?: string | null;
  sql?: string;
  platformSql?: string;
  persistSql?: string;
  instructorSql?: string;
  instructions?: string[];
  error?: string;
};

type SqlKind = "schema" | "platform" | "persist" | "instructor";

export default function SetupPage() {
  const [data, setData] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<SqlKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<SqlKind>("schema");

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/setup/schema", { cache: "no-store" });
      const json = (await res.json()) as SchemaResponse;
      console.info("[setup] schema status:", json);
      setData(json);
      if (json.tableReady && !json.instructorIdReady) {
        setPreview("instructor");
      }
    } catch (error) {
      console.error("[setup] fetch failed:", error);
      setMessage("セットアップ情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sqlFor = (kind: SqlKind): string | undefined => {
    if (kind === "schema") return data?.sql;
    if (kind === "platform") return data?.platformSql;
    if (kind === "persist") return data?.persistSql;
    return data?.instructorSql;
  };

  const labelFor = (kind: SqlKind): string => {
    if (kind === "schema") return "schema.sql";
    if (kind === "platform") return "platform-v1.sql";
    if (kind === "persist") return "analysis-persist-v1.sql";
    return "clients-instructor-id.sql";
  };

  const copySql = async (kind: SqlKind) => {
    const sql = sqlFor(kind);
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(kind);
      setPreview(kind);
      setMessage(`${labelFor(kind)} をクリップボードにコピーしました。`);
      window.setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("[setup] clipboard failed:", error);
      setMessage("コピーに失敗しました。下の SQL を手動で選択してください。");
    }
  };

  const previewSql = sqlFor(preview);
  const sqlKinds = ["schema", "platform", "persist", "instructor"] as const;

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          SUPABASE SETUP
        </p>
        <h1
          className="mt-3 text-3xl font-semibold tracking-[-0.04em]"
          style={{ color: NAVY }}
        >
          データベース初期設定
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-slate-600">
          第一期卒業生が分析を保存・履歴確認するには、以下の SQL をこの順で実行してください。
          アプリは移行前の owner_id にも一時対応していますが、正規カラムは instructor_id です。
        </p>
        <p className="mt-3 text-[14px] leading-6 text-slate-600">
          Version 1.0 Beta のデータ保存・読み込み確認は{" "}
          <Link
            href="/setup/beta-verify"
            className="font-medium underline underline-offset-2"
            style={{ color: NAVY }}
          >
            /setup/beta-verify
          </Link>{" "}
          で実行できます。
        </p>

        <section className="mt-8 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)]">
          <h2 className="text-lg font-semibold" style={{ color: NAVY }}>
            現在の状態
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">確認中...</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              <StatusRow
                label="1. ベーススキーマ (clients / analyses)"
                ready={Boolean(data?.tableReady)}
              />
              <StatusRow
                label="2. Platform V1 (クレジット・会員・履歴)"
                ready={Boolean(data?.platformReady)}
              />
              <StatusRow
                label="3. 分析永続化 (二重消費防止・レポート保存)"
                ready={Boolean(data?.persistReady)}
              />
              <StatusRow
                label={`4. clients.instructor_id（現在: ${data?.instructorColumn ?? "不明"}）`}
                ready={Boolean(data?.instructorIdReady)}
              />
            </ul>
          )}

          {!loading && data?.probeError && !data.tableReady && (
            <div className="mt-3 space-y-2 text-sm text-rose-700">
              {data.probeCode && (
                <p className="font-mono text-[13px]">code: {data.probeCode}</p>
              )}
              <p className="break-words font-mono text-[13px]">
                {data.probeError}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              再確認
            </button>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: NAVY }}
            >
              ダッシュボードへ
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold" style={{ color: NAVY }}>
            手順
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-slate-600">
            {(data?.instructions ?? [
              "Supabase Dashboard → SQL Editor → New query",
              "1) schema.sql を貼り付けて Run",
              "2) platform-v1.sql を貼り付けて Run",
              "3) analysis-persist-v1.sql を貼り付けて Run",
              "4) clients-instructor-id.sql を貼り付けて Run",
            ]).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap gap-3">
            {sqlKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => void copySql(kind)}
                disabled={!sqlFor(kind)}
                className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: NAVY }}
              >
                {copied === kind ? "コピーしました" : `${labelFor(kind)} をコピー`}
              </button>
            ))}
            <a
              href="https://supabase.com/dashboard/project/_/sql/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Supabase SQL Editor を開く
            </a>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {sqlKinds.map((kind) => (
              <button
                key={`preview-${kind}`}
                type="button"
                onClick={() => setPreview(kind)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${
                  preview === kind
                    ? "bg-[#071426] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {labelFor(kind)}
              </button>
            ))}
          </div>

          {message && (
            <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
          )}

          {previewSql && (
            <pre className="mt-5 max-h-[420px] overflow-auto rounded-2xl bg-[#0b1220] p-4 text-[12px] leading-5 text-slate-200">
              {previewSql}
            </pre>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl bg-[#fafaf8] px-4 py-3">
      <span className="text-slate-700">{label}</span>
      <span
        className={`shrink-0 font-semibold ${
          ready ? "text-[#0f6b5c]" : "text-[#a33a3a]"
        }`}
      >
        {ready ? "OK" : "未適用"}
      </span>
    </li>
  );
}
