import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  generateRuleBasedCompareComments,
  type CompareMetricRow,
  type HealthTrend,
} from "@/lib/comparison-engine";
import { openaiErrorMessage } from "@/lib/openai-helpers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const isDev = process.env.NODE_ENV === "development";

type MetricPayload = {
  label: string;
  beforeDisplay: string;
  afterDisplay: string;
  deltaDisplay: string;
  trend: HealthTrend;
  key?: string;
};

type CompareCommentRequest = {
  clientName?: string;
  beforeDate?: string;
  afterDate?: string;
  assessment?: string;
  scoreDelta?: number | null;
  metrics?: MetricPayload[];
};

export type CompareCommentResponse = {
  improvements: string;
  concerns: string;
  factors: string;
  nextGuidance: string;
  aiNarrative: string;
  source?: "ai" | "rules";
};

function asString(value: unknown, max = 400): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function toMetricRows(metrics: MetricPayload[]): CompareMetricRow[] {
  return metrics.map((m, index) => {
    const trend: HealthTrend =
      m.trend === "improved" || m.trend === "worsened" || m.trend === "unchanged"
        ? m.trend
        : "unchanged";
    return {
      key: (m.key as CompareMetricRow["key"]) || "sleepScore",
      label: asString(m.label, 40) || `指標${index + 1}`,
      beforeDisplay: asString(m.beforeDisplay, 40) || "—",
      afterDisplay: asString(m.afterDisplay, 40) || "—",
      beforeNumeric: null,
      afterNumeric: null,
      delta: null,
      deltaDisplay: asString(m.deltaDisplay, 40) || "—",
      trend,
      arrow: trend === "improved" ? "↑" : trend === "worsened" ? "↓" : "→",
      lowerIsBetter: false,
      unitHint: "",
    };
  });
}

function rulesFallback(
  metrics: MetricPayload[],
  scoreDelta: number | null,
): CompareCommentResponse {
  const comments = generateRuleBasedCompareComments(
    toMetricRows(metrics),
    scoreDelta,
  );
  return { ...comments, source: "rules" };
}

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "認証設定を確認してください。" },
        { status: 503 },
      );
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }
  }

  let body: CompareCommentRequest;
  try {
    body = (await request.json()) as CompareCommentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const metrics = Array.isArray(body.metrics) ? body.metrics.slice(0, 12) : [];
  if (metrics.length === 0) {
    return NextResponse.json(
      { error: "比較指標がありません。" },
      { status: 400 },
    );
  }

  const scoreDelta =
    typeof body.scoreDelta === "number" && Number.isFinite(body.scoreDelta)
      ? body.scoreDelta
      : null;

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(rulesFallback(metrics, scoreDelta));
  }

  const metricLines = metrics
    .map(
      (m) =>
        `- ${asString(m.label, 40)}: ${asString(m.beforeDisplay, 40)} → ${asString(m.afterDisplay, 40)} (${asString(m.deltaDisplay, 40)}, ${asString(m.trend, 20)})`,
    )
    .join("\n");

  const prompt = `あなたは睡眠ウェルネス認定講師向けの比較分析アシスタントです。
2回の睡眠分析の差分から、改善点・悪化点・要因・次の指導を日本語で簡潔にまとめてください。

クライアント名: ${asString(body.clientName, 80) || "未設定"}
Before日付: ${asString(body.beforeDate, 32) || "不明"}
After日付: ${asString(body.afterDate, 32) || "不明"}
総合評価: ${asString(body.assessment, 40) || "不明"}
スコア差: ${scoreDelta == null ? "不明" : scoreDelta}

指標差分:
${metricLines}

出力は JSON のみ。キー:
- improvements: 改善した点（2〜4文）
- concerns: 悪化または注意点（2〜4文）
- factors: 考えられる要因（2〜3文）
- nextGuidance: 次の指導提案（2〜4文、具体的な行動）
- aiNarrative: 講師向けの短い総評（3〜5文）`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "睡眠コーチングの専門家として、数値差分に基づき実践的な日本語コメントを返す。医療診断はしない。",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json(rulesFallback(metrics, scoreDelta));
    }

    const response: CompareCommentResponse = {
      improvements: asString(parsed.improvements, 800),
      concerns: asString(parsed.concerns, 800),
      factors: asString(parsed.factors, 800),
      nextGuidance: asString(parsed.nextGuidance, 800),
      aiNarrative: asString(parsed.aiNarrative, 1200),
      source: "ai",
    };

    if (
      !response.improvements &&
      !response.concerns &&
      !response.aiNarrative
    ) {
      return NextResponse.json(rulesFallback(metrics, scoreDelta));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/compare-comment]", openaiErrorMessage(error));
    return NextResponse.json(rulesFallback(metrics, scoreDelta));
  }
}
