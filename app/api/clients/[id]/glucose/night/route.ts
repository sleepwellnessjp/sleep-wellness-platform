import { NextResponse } from "next/server";
import { buildNightGlucoseReportPayload } from "@/lib/glucose/night-glucose-report";
import { addCalendarDaysTokyo } from "@/lib/glucose/night-glucose-stats";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/clients/[id]/glucose/night
 * ?analysisDate=YYYY-MM-DD&sleepOnset=HH:mm&wake=HH:mm
 */
export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id: clientId } = await context.params;
  if (!clientId) {
    return NextResponse.json(
      { error: "クライアント ID が必要です" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const analysisDate = url.searchParams.get("analysisDate")?.trim() ?? "";
  const sleepOnset = url.searchParams.get("sleepOnset")?.trim() || null;
  const wake = url.searchParams.get("wake")?.trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(analysisDate)) {
    return NextResponse.json(
      { error: "analysisDate (YYYY-MM-DD) が必要です" },
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

  const prev = addCalendarDaysTokyo(analysisDate, -1);
  const next = addCalendarDaysTokyo(analysisDate, 1);
  const rangeStart = new Date(`${prev}T12:00:00+09:00`).toISOString();
  const rangeEnd = new Date(`${next}T12:00:00+09:00`).toISOString();

  const { data: rows, error: glucoseError } = await supabase
    .from("glucose_readings")
    .select("recorded_at, record_type, glucose_mg_dl")
    .eq("client_id", clientId)
    .gte("recorded_at", rangeStart)
    .lt("recorded_at", rangeEnd)
    .order("recorded_at", { ascending: true });

  if (glucoseError) {
    return NextResponse.json({ error: glucoseError.message }, { status: 500 });
  }

  const readings = (rows ?? []).map((r) => ({
    recordedAtIso: r.recorded_at,
    recordType: r.record_type,
    glucoseMgDl: r.glucose_mg_dl,
  }));

  const payload = buildNightGlucoseReportPayload({
    analysisDate,
    sleepOnsetTime: sleepOnset,
    wakeTime: wake,
    readings,
  });

  return NextResponse.json({ ok: true, ...payload });
}
