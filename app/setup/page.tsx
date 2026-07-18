"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

type SchemaResponse = {
  tableReady?: boolean;
  missingTable?: boolean;
  probeError?: string | null;
  probeCode?: string | null;
  sql?: string;
  instructions?: string[];
  error?: string;
};

export default function SetupPage() {
  const [data, setData] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/setup/schema", { cache: "no-store" });
      const json = (await res.json()) as SchemaResponse;
      console.info("[setup] schema status:", json);
      setData(json);
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

  const copySql = async () => {
    if (!data?.sql) return;
    try {
      await navigator.clipboard.writeText(data.sql);
      setCopied(true);
      setMessage("schema.sql をクリップボードにコピーしました。");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("[setup] clipboard failed:", error);
      setMessage("コピーに失敗しました。下の SQL を手動で選択してください。");
    }
  };

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
          ログインは Auth のみで動作しますが、クライアント登録には
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">
            public.clients
          </code>
          テーブルが必要です。未作成の場合は schema.sql を実行してください。
        </p>

        <section className="mt-8 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)]">
          <h2 className="text-lg font-semibold" style={{ color: NAVY }}>
            現在の状態
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">確認中...</p>
          ) : data?.tableReady ? (
            <p className="mt-3 text-sm font-medium text-[#0f6b5c]">
              clients テーブルは利用可能です。新規クライアント登録ができます。
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-rose-700">
              <p className="font-medium">
                clients テーブルが見つかりません（登録失敗の原因）。
              </p>
              {data?.probeCode && (
                <p className="font-mono text-[13px]">code: {data.probeCode}</p>
              )}
              {data?.probeError && (
                <p className="break-words font-mono text-[13px]">
                  {data.probeError}
                </p>
              )}
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
              "schema.sql を貼り付けて Run",
              "このページで再確認 → 新規登録を試す",
            ]).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copySql()}
              disabled={!data?.sql}
              className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: NAVY }}
            >
              {copied ? "コピーしました" : "schema.sql をコピー"}
            </button>
            <a
              href="https://supabase.com/dashboard/project/cqfclbyzdmxfgktkbbsz/sql/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Supabase SQL Editor を開く
            </a>
          </div>

          {message && (
            <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
          )}

          {data?.sql && (
            <pre className="mt-5 max-h-[420px] overflow-auto rounded-2xl bg-[#0b1220] p-4 text-[12px] leading-5 text-slate-200">
              {data.sql}
            </pre>
          )}
        </section>
      </div>
    </main>
  );
}
