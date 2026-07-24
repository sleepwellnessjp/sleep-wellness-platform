import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { insertAnalysisWithSchemaFallback } from "@/lib/repositories/analyses-insert";

export const runtime = "nodejs";

/**
 * analysis_date 未適用環境での保存フォールバックと、
 * structured metrics カラム有無をログイン講師セッションで確認する。
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase 未設定" },
        { status: 503 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "ログインが必要です" },
        { status: 401 },
      );
    }

    const { error: structuredProbeError } = await supabase
      .from("analyses")
      .select("id, analysis_date")
      .limit(1);
    const structuredReady = !structuredProbeError;

    // 所有クライアントを1件取得（無ければ検証用に作成しない — 既存必須）
    const { data: clients, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .limit(1);
    if (clientError) {
      return NextResponse.json(
        { ok: false, error: clientError.message, structuredReady },
        { status: 500 },
      );
    }
    const clientId = (clients?.[0] as { id?: string } | undefined)?.id;
    if (!clientId) {
      return NextResponse.json(
        {
          ok: false,
          error: "検証用クライアントがありません。先にクライアントを作成してください。",
          structuredReady,
        },
        { status: 400 },
      );
    }

    const analysisDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const inserted = await insertAnalysisWithSchemaFallback(supabase, {
      client_id: clientId,
      owner_id: user.id,
      analyzed_at: new Date(`${analysisDate}T12:00:00`).toISOString(),
      analysis_date: analysisDate,
      sleep_score: 72,
      sleep_duration: 7.2,
      sleep_efficiency: 88,
      deep_sleep: 1.4,
      awakenings: 2,
      sleep_latency: 18,
      spo2: 96,
      hrv: 42,
      resting_heart_rate: 58,
      sleep_onset_time: "23:10",
      wake_time: "06:30",
      ocr_data: {
        extracted: {},
        confirmed: { sleepScore: 72 },
        structured: {},
        analysisDate,
        verifyMarker: "analysis-date-fallback-verify",
      },
      confirmed_metrics: { sleepScore: 72 },
      report_payload: {
        medical: { summary: "verify" },
        visual: {},
        clientName: "verify",
        measurementDate: analysisDate,
      },
      ai_result: {
        summary: "verify insert",
        metrics: { sleepScore: 72 },
        measurementDate: analysisDate,
      },
      credits_consumed: 0,
    });

    // 読み戻し
    const { data: readBack, error: readError } = await supabase
      .from("analyses")
      .select("id, ai_result, ocr_data, sleep_score")
      .eq("id", inserted.id)
      .maybeSingle();

    // 検証行を削除
    await supabase.from("analyses").delete().eq("id", inserted.id);

    if (readError || !readBack) {
      return NextResponse.json(
        {
          ok: false,
          structuredReady,
          insertedId: inserted.id,
          error: readError?.message || "read-back failed",
        },
        { status: 500 },
      );
    }

    const sqlPath = path.join(
      process.cwd(),
      "supabase",
      "analysis-structured-metrics.sql",
    );
    const structuredSql = await readFile(sqlPath, "utf8");

    return NextResponse.json({
      ok: true,
      structuredReady,
      saved: true,
      readBack: true,
      analysisId: inserted.id,
      sleepScore: (readBack as { sleep_score?: number }).sleep_score,
      note: structuredReady
        ? "analysis_date カラムあり。フルペイロードで保存可能。"
        : "analysis_date 未適用。アプリのスキーマフォールバックで保存成功。/setup で analysis-structured-metrics.sql を実行してください。",
      structuredSqlLength: structuredSql.length,
    });
  } catch (error) {
    console.error("[api/setup/verify-analysis-save]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "verify failed",
      },
      { status: 500 },
    );
  }
}
