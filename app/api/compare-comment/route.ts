import OpenAI from "openai";
import { NextResponse } from "next/server";
import { openaiErrorMessage } from "@/lib/openai-helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

const isDev = process.env.NODE_ENV === "development";

type MetricPayload = {
  label: string;
  beforeDisplay: string;
  afterDisplay: string;
  deltaDisplay: string;
  trend: "improved" | "worsened" | "unchanged";
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
};

function asString(value: unknown, max = 400): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "AIコメントAPIの設定が完了していません。OPENAI_API_KEY を設定してください。",
        details: isDev ? "OPENAI_API_KEY is missing." : undefined,
      },
      { status: 503 },
    );
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
スコア差: ${body.scoreDelta == null ? "不明" : body.scoreDelta}

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
      return NextResponse.json(
        { error: "AIコメントの解析に失敗しました。" },
        { status: 502 },
      );
    }

    const response: CompareCommentResponse = {
      improvements: asString(parsed.improvements, 800),
      concerns: asString(parsed.concerns, 800),
      factors: asString(parsed.factors, 800),
      nextGuidance: asString(parsed.nextGuidance, 800),
      aiNarrative: asString(parsed.aiNarrative, 1200),
    };

    if (
      !response.improvements &&
      !response.concerns &&
      !response.aiNarrative
    ) {
      return NextResponse.json(
        { error: "AIコメントが空でした。" },
        { status: 502 },
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/compare-comment]", openaiErrorMessage(error));
    return NextResponse.json(
      {
        error: "AIコメントの生成に失敗しました。",
        details: isDev ? openaiErrorMessage(error) : undefined,
      },
      { status: 502 },
    );
  }
}
