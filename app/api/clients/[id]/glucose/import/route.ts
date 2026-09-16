import { NextResponse } from "next/server";
import { importLibreGlucoseCsvForClient } from "@/lib/glucose/glucose-import-service";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id: clientId } = await context.params;
  if (!clientId) {
    return NextResponse.json(
      { error: "クライアント ID が必要です" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase が設定されていません" },
      { status: 503 },
    );
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, instructor_id")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }
  if (!client) {
    return NextResponse.json(
      { error: "クライアントが見つかりません" },
      { status: 404 },
    );
  }
  if (client.instructor_id !== auth.user.id) {
    return NextResponse.json(
      { error: "このクライアントへの権限がありません" },
      { status: 403 },
    );
  }

  let csvText = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "CSV ファイルを選択してください" },
        { status: 400 },
      );
    }
    csvText = await file.text();
  } else {
    csvText = await request.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json(
      { error: "CSV が空です" },
      { status: 400 },
    );
  }

  try {
    const summary = await importLibreGlucoseCsvForClient({
      supabase,
      clientId,
      ownerId: auth.user.id,
      csvText,
    });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取り込みに失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
