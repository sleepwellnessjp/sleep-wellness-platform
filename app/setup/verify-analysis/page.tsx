"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import InstructorNav from "@/components/InstructorNav";

const NAVY = "#071426";

type VerifyResponse = {
  ok?: boolean;
  structuredReady?: boolean;
  saved?: boolean;
  readBack?: boolean;
  analysisId?: string;
  sleepScore?: number;
  note?: string;
  error?: string;
};

export default function VerifyAnalysisSavePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/setup/verify-analysis-save", {
        method: "POST",
        cache: "no-store",
      });
      const json = (await res.json()) as VerifyResponse;
      setResult(json);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "verify failed",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav />
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold" style={{ color: NAVY }}>
          分析保存検証
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-slate-600">
          ログイン中の講師セッションで analyses への insert（analysis_date
          フォールバック含む）を確認します。検証行は直後に削除されます。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            {loading ? "検証中..." : "保存検証を実行"}
          </button>
          <Link
            href="/setup"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700"
          >
            セットアップへ
          </Link>
        </div>
        {result && (
          <pre className="mt-6 overflow-auto rounded-2xl bg-[#0b1220] p-4 text-[12px] leading-5 text-slate-200">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
