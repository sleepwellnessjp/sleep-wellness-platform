import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isMissingTableError, readSupabaseError } from "@/lib/supabase/errors";

export const runtime = "nodejs";

/** schema.sql / platform-v1.sql の内容を返す（コピー用）＋テーブル存在確認 */
export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
    const platformPath = path.join(process.cwd(), "supabase", "platform-v1.sql");
    const persistPath = path.join(
      process.cwd(),
      "supabase",
      "analysis-persist-v1.sql",
    );
    const [sql, platformSql, persistSql] = await Promise.all([
      readFile(schemaPath, "utf8"),
      readFile(platformPath, "utf8"),
      readFile(persistPath, "utf8"),
    ]);

    const supabase = await createServerSupabaseClient();
    let tableReady = false;
    let platformReady = false;
    let persistReady = false;
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
      platformReady = !platformError;

      const { error: persistError } = await supabase
        .from("analyses")
        .select("id, confirmed_metrics, report_payload, credits_consumed")
        .limit(1);
      persistReady = !persistError;
    }

    return NextResponse.json({
      tableReady,
      platformReady,
      persistReady,
      missingTable: probeError
        ? isMissingTableError({ code: probeCode, message: probeError })
        : !tableReady,
      probeError,
      probeCode,
      sql,
      platformSql,
      persistSql,
      instructions: [
        "Supabase Dashboard → SQL Editor → New query を開く",
        "1) schema.sql を貼り付けて Run",
        "2) platform-v1.sql を貼り付けて Run（クレジット・会員・履歴）",
        "3) analysis-persist-v1.sql を貼り付けて Run（保存強化・二重消費防止）",
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
