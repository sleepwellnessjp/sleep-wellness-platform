import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  peekClientsInstructorColumn,
  resetClientsInstructorColumnCache,
  resolveClientsInstructorColumn,
} from "@/lib/supabase/clients-instructor-column";
import { isMissingTableError, readSupabaseError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** schema.sql / platform-v1.sql の内容を返す（コピー用）＋テーブル存在確認 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
    const platformPath = path.join(process.cwd(), "supabase", "platform-v1.sql");
    const persistPath = path.join(
      process.cwd(),
      "supabase",
      "analysis-persist-v1.sql",
    );
    const structuredPath = path.join(
      process.cwd(),
      "supabase",
      "analysis-structured-metrics.sql",
    );
    const instructorPath = path.join(
      process.cwd(),
      "supabase",
      "clients-instructor-id.sql",
    );
    const [sql, platformSql, persistSql, structuredSql, instructorSql] =
      await Promise.all([
        readFile(schemaPath, "utf8"),
        readFile(platformPath, "utf8"),
        readFile(persistPath, "utf8"),
        readFile(structuredPath, "utf8"),
        readFile(instructorPath, "utf8"),
      ]);

    const supabase = await createServerSupabaseClient();
    let tableReady = false;
    let platformReady = false;
    let persistReady = false;
    let structuredReady = false;
    let instructorIdReady = false;
    let instructorColumn: "instructor_id" | "owner_id" | null = null;
    let probeError: string | null = null;
    let probeCode: string | null = null;

    if (supabase) {
      const { error } = await supabase.from("clients").select("id").limit(1);
      if (!error) {
        tableReady = true;
      } else {
        const parsed = readSupabaseError(error);
        probeError = parsed.message;
        probeCode = parsed.code || null;
        console.error("[api/setup/schema] clients probe:", error);
      }

      const { error: platformError } = await supabase
        .from("monthly_credit")
        .select("id")
        .limit(1);
      const { error: membershipError } = await supabase
        .from("membership")
        .select("id")
        .limit(1);
      platformReady = !platformError && !membershipError;

      const { error: persistError } = await supabase
        .from("analyses")
        .select("id, confirmed_metrics, report_payload, credits_consumed")
        .limit(1);
      persistReady = !persistError;

      const { error: structuredError } = await supabase
        .from("analyses")
        .select(
          "id, analysis_date, sleep_onset_time, wake_time, stress_series, ocr_confidence",
        )
        .limit(1);
      structuredReady = !structuredError;

      if (tableReady) {
        resetClientsInstructorColumnCache();
        instructorColumn = await resolveClientsInstructorColumn(supabase);
        instructorIdReady = instructorColumn === "instructor_id";
      }
    }

    return NextResponse.json({
      tableReady,
      platformReady,
      persistReady,
      structuredReady,
      instructorIdReady,
      instructorColumn: instructorColumn ?? peekClientsInstructorColumn(),
      missingTable: probeError
        ? isMissingTableError({ code: probeCode, message: probeError })
        : !tableReady,
      probeError,
      probeCode,
      sql,
      platformSql,
      persistSql,
      structuredSql,
      instructorSql,
      instructions: [
        "Supabase Dashboard → SQL Editor → New query を開く",
        "1) schema.sql を貼り付けて Run",
        "2) platform-v1.sql を貼り付けて Run（クレジット・会員・履歴）",
        "3) analysis-persist-v1.sql を貼り付けて Run（保存強化・二重消費防止）",
        "4) analysis-structured-metrics.sql を貼り付けて Run（analysis_date / OCR構造化）",
        "5) clients-instructor-id.sql を貼り付けて Run（owner_id → instructor_id）",
        "完了後、このアプリで新規クライアント登録 / 分析を再試行する",
      ],
    });
  } catch (error) {
    console.error("[api/setup/schema] GET failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "schema.sql の読み込みに失敗しました。",
      },
      { status: 500 },
    );
  }
}
