import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isMissingTableError, readSupabaseError } from "@/lib/supabase/errors";

export const runtime = "nodejs";

/** schema.sql の内容を返す（コピー用）＋ clients テーブル存在確認 */
export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
    const sql = await readFile(schemaPath, "utf8");

    const supabase = await createServerSupabaseClient();
    let tableReady = false;
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
    }

    return NextResponse.json({
      tableReady,
      missingTable: probeError
        ? isMissingTableError({ code: probeCode, message: probeError })
        : !tableReady,
      probeError,
      probeCode,
      sql,
      instructions: [
        "Supabase Dashboard → SQL Editor → New query を開く",
        "下記 sql をすべて貼り付けて Run する",
        "完了後、このアプリで新規クライアント登録を再試行する",
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
