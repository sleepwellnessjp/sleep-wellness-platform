import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  metricsJsonSchema,
  openaiErrorMessage,
} from "@/lib/openai-helpers";
import { normalizeMetrics, type AnalysisMetrics } from "@/lib/analysis-session";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";

type LifestyleData = {
  clientName?: string;
  measurementDate?: string;
  bedtime?: string;
  wakeTime?: string;
  exercise?: string;
  yoga?: string;
  yogaDone?: string;
  yogaDuration?: string;
  yogaTime?: string;
  yogaNotes?: string;
  pilates?: string;
  pilatesDone?: string;
  pilatesDuration?: string;
  pilatesTime?: string;
  pilatesNotes?: string;
  otherExerciseDone?: string;
  otherExerciseName?: string;
  otherExerciseDuration?: string;
  otherExerciseTime?: string;
  otherExerciseNotes?: string;
  bathing?: string;
  alcohol?: string;
  alcoholDrank?: string;
  alcoholType?: string;
  alcoholAmount?: string;
  alcoholEndTime?: string;
  alcoholNotes?: string;
  caffeine?: string;
  caffeineDone?: string;
  caffeineType?: string;
  caffeineAmount?: string;
  caffeineTime?: string;
  caffeineNotes?: string;
  stress?: string;
  meals?: string;
  breakfastEaten?: string;
  breakfastTime?: string;
  breakfastContent?: string;
  lunchEaten?: string;
  lunchTime?: string;
  lunchContent?: string;
  dinnerEaten?: string;
  dinnerTime?: string;
  dinnerContent?: string;
  work?: string;
  condition?: string;
  nasalCongestion?: string;
  notes?: string;
};

type AnalyzeRequestBody = {
  lifestyle?: LifestyleData;
  images?: unknown;
  metrics?: Partial<AnalysisMetrics>;
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "score",
    "scoreBreakdown",
    "metrics",
    "goodPoints",
    "improvements",
    "dataInsight",
    "lifestyleRelation",
    "tomorrowPlan",
    "caution",
    "disclaimer",
  ],
  properties: {
    summary: { type: "string" },
    score: { type: "number" },
    scoreBreakdown: {
      type: "object",
      additionalProperties: false,
      required: [
        "sleepDuration",
        "sleepEfficiency",
        "deepSleep",
        "hrv",
        "stress",
        "spo2",
        "recovery",
      ],
      properties: {
        sleepDuration: { type: "integer", enum: [1, 2, 3, 4, 5] },
        sleepEfficiency: { type: "integer", enum: [1, 2, 3, 4, 5] },
        deepSleep: { type: "integer", enum: [1, 2, 3, 4, 5] },
        hrv: { type: "integer", enum: [1, 2, 3, 4, 5] },
        stress: { type: "integer", enum: [1, 2, 3, 4, 5] },
        spo2: { type: "integer", enum: [1, 2, 3, 4, 5] },
        recovery: { type: "integer", enum: [1, 2, 3, 4, 5] },
      },
    },
    metrics: metricsJsonSchema,
    goodPoints: {
      type: "array",
      items: { type: "string" },
    },
    improvements: {
      type: "array",
      items: { type: "string" },
    },
    dataInsight: { type: "string" },
    lifestyleRelation: { type: "string" },
    tomorrowPlan: {
      type: "array",
      items: { type: "string" },
    },
    caution: { type: "string" },
    disclaimer: { type: "string" },
  },
} as const;

const SYSTEM_INSTRUCTIONS = `あなたは Sleep Wellness Institute Japan（SWIJ）創設者・若林貴久の睡眠分析エンジン
「Sleep Wellness Brain™ Version 1」です。
SOXAIなどのウェアラブル睡眠データ画像と、利用者の生活習慣情報、
および確認済みの抽出メトリクスをもとに、SWIJ専用レポートを日本語で作成してください。
AI、ChatGPT、モデル名、エンジン名などの内部事情は文章に書かないでください。

==============================
Sleep Wellness Brain™ Version 1 — 必須ルール（厳守）
==============================

① 睡眠時間だけで評価しない
睡眠効率・深い睡眠・浅い睡眠・REM・HRV・ストレス・SpO₂・呼吸・体内時計・
皮膚温・入眠潜時・睡眠負債・生活習慣を総合評価する。
「〇時間だから良い／悪い」という単軸評価は禁止。

② まず良かった点から話す
summary（総合評価）の冒頭、および goodPoints を先に示す。課題から入らない。

③ 改善点は最大2件（improvements は必ず2件以内）
本人を責めず、「改善余地」「整える余地」と書く。

④ Tomorrow Plan は最大3件（tomorrowPlan は必ず3件以内）
1件目は「最優先」と分かる表現。今日から実行できる具体策のみ。

⑤ 医療診断はしない
病名・異常・疾患の断定、治療指示は禁止。睡眠ウェルネス支援として書く。

⑥ 「可能性があります」という表現を使う
要因や影響は断定せず、可能性として述べる。

⑦ 単日データで結論を出さない
数日〜2週間の推移を見るよう、summary または caution で必ず促す。

⑧ 「睡眠時間を増やしてください」だけで終わらない
効率・深い睡眠・入眠前の切り替え・呼吸・入浴・照明・飲酒終了時刻・夕食時間など、
現実的な改善策を提案する。

⑨ 入力内容に応じて提案を選ぶ（毎回同じ提案をしない）
候補：メラトニンヨガ™、呼吸法、入浴、照明、飲酒、鼻づまり、夕食時間、カフェイン、運動。
- 入力やデータに根拠がある項目だけ提案する
- メラトニンヨガ™を毎回機械的に勧めない
- 当てはまらない習慣は無理に触れない

⑩ 文章は簡潔で読みやすく
1文は短く。冗長な言い回し・同じ内容の繰り返しを避ける。重要文のみ **太字**。

==============================
確認済みメトリクスの扱い（最重要）
==============================
ユーザーが確認・確定したメトリクスが渡された場合、それを分析の唯一の数値根拠とする。
画像の再読取で上書きしない。空文字の項目は「確認できなかった」扱いとし、推測で埋めない。
出力 JSON の metrics には、確認済みメトリクスをそのまま（または同等の表記で）入れる。

確認済みメトリクスが無い場合のみ、画像から最大限抽出する:
- 手入力より画像を常に優先する
- 推測で数値を作らない。読めない項目は ""、sleepScore は null

必ず扱う項目:
睡眠スコア / 睡眠時間 / 入眠時間 / 起床時間 / 睡眠効率 / 睡眠負債 / 体内時計 /
入眠潜時 / 覚醒時間 / 覚醒率 / REM睡眠 / レム睡眠率 / 浅い睡眠 / 浅い睡眠率 /
深い睡眠 / 深い睡眠率 / 呼吸速度 / 平均SpO₂ / 安静時心拍数 / HRV / 皮膚温度 / ストレス

【ストレス】
- 測定ストレスは metrics.stress
- 「主観的ストレス・気分」は本人申告。metrics.stress に入れず文章で分けて扱う

==============================
レポート構成（この順序・この役割で書く）
==============================
① summary（総合評価）
  2〜4文。良かった点→課題→背景（可能性）→推移の見方。簡潔に。

② goodPoints（今回良かった点）
  最大3件。なぜ良いかが分かる短い文。

③ improvements（改善点）
  最大2件。「改善余地」「整える余地」。

④ dataInsight（睡眠データ考察）
  3〜5文。metrics の数値に基づき、ステージバランス・効率・回復指標を考察。
  数値がある項目を具体的に触れる。読めない項目は触れない。

⑤ lifestyleRelation（生活習慣との関係）
  3〜5文。入力された生活習慣と睡眠データの関係を可能性として述べる。
  該当しない習慣は無理に書かない。

⑥ tomorrowPlan（Tomorrow Plan）
  最大3件。1件目は最優先。今日できる具体策（時間・回数・タイミング）。

- caution: 単日の限界を簡潔に。強い症状・呼吸苦・著しいSpO₂低下が疑われる場合のみ医療機関相談を穏やかに促す
- disclaimer: 睡眠ウェルネス支援であり医療診断・治療を代替しない旨を簡潔に
- scoreBreakdown: 各1〜5。未確認項目は控えめ推定。score と矛盾しないこと
- score: SWIJ 総合スコア 0〜100

==============================
入力連動の提案ガイド
==============================
- 飲酒あり／終了が遅い → 終了時刻の前倒しや量の調整
- 鼻づまりあり → 呼吸の通しやすさ・就寝姿勢・加湿
- 夕食が遅い → 夕食時間と入眠の間隔
- 入浴の記載 → 就寝前の体温低下を助ける入浴タイミング（必要時のみ）
- ストレス高め・HRV低め・入眠前の切り替え不足が疑われる場合のみメラトニンヨガ™
- 当てはまらない場合は短い呼吸法や休養を優先

【運動】ヨガ／ピラティス／その他を区別。実施時間と時刻を考慮。効果を断定しない。
【カフェイン】種類・量・摂取時刻。午後以降・就寝間隔を確認。責める表現は使わない。
【食事】朝昼夕の食べた／食べていないを区別。欠食だけで断定しない。
【飲酒】種類・量・終了時刻・就寝間隔。量不明は推測しない。

==============================
文章の口調（若林貴久）
==============================
- やさしく実践的。専門用語は短く意味を補う
- 「まずは」「今回のデータでは」「可能性があります」「推移を確認しましょう」を自然に使う
- 過剰に褒めず、問題を過度に深刻化しない。命令口調・責め口調は禁止
- 一般論の羅列は禁止。今回のデータと入力に紐づける
- 出力は指定の JSON スキーマのみ`;

function validateBody(body: unknown): {
  ok: true;
  lifestyle: LifestyleData;
  images: string[];
  metrics?: AnalysisMetrics;
} | {
  ok: false;
  message: string;
} {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "リクエスト形式が正しくありません。" };
  }

  const { lifestyle, images, metrics } = body as AnalyzeRequestBody;

  if (!lifestyle || typeof lifestyle !== "object" || Array.isArray(lifestyle)) {
    return { ok: false, message: "生活習慣データが不足しています。" };
  }

  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, message: "睡眠データ画像が不足しています。" };
  }

  if (!images.every(isImageDataUrl)) {
    return {
      ok: false,
      message: "画像は JPEG または PNG の data URL で送信してください。",
    };
  }

  const confirmed =
    metrics && typeof metrics === "object" && !Array.isArray(metrics)
      ? normalizeMetrics(metrics)
      : undefined;

  return { ok: true, lifestyle, images, metrics: confirmed };
}

function formatYesNone(
  value: string | undefined,
  yesLabel: string,
  noneLabel: string,
): string | undefined {
  if (value === "yes") return yesLabel;
  if (value === "none") return noneLabel;
  return value;
}

function formatCaffeineType(value: string | undefined): string | undefined {
  if (!value) return value;
  const labels: Record<string, string> = {
    coffee: "コーヒー",
    green_tea: "緑茶",
    black_tea: "紅茶",
    energy_drink: "エナジードリンク",
    other: "その他",
  };
  return labels[value] ?? value;
}

function formatConfirmedMetrics(metrics: AnalysisMetrics): string {
  const rows: Array<[string, string]> = [
    [
      "睡眠スコア",
      metrics.sleepScore == null ? "未確認" : String(metrics.sleepScore),
    ],
    ["睡眠時間", metrics.sleepDuration || "未確認"],
    ["入眠時間", metrics.bedtime || "未確認"],
    ["起床時間", metrics.wakeTime || "未確認"],
    ["睡眠効率", metrics.sleepEfficiency || "未確認"],
    ["覚醒時間", metrics.awakenings || "未確認"],
    ["覚醒率", metrics.awakeningRate || "未確認"],
    ["REM睡眠", metrics.remSleep || "未確認"],
    ["レム睡眠率", metrics.remSleepRate || "未確認"],
    ["浅い睡眠", metrics.lightSleep || "未確認"],
    ["浅い睡眠率", metrics.lightSleepRate || "未確認"],
    ["深い睡眠", metrics.deepSleep || "未確認"],
    ["深い睡眠率", metrics.deepSleepRate || "未確認"],
    ["睡眠負債", metrics.sleepDebt || "未確認"],
    ["入眠潜時", metrics.sleepLatency || "未確認"],
    ["体内時計", metrics.circadianRhythm || "未確認"],
    ["呼吸速度", metrics.respiratoryRate || "未確認"],
    ["平均SpO₂", metrics.spo2 || "未確認"],
    ["安静時心拍数", metrics.restingHeartRate || "未確認"],
    ["HRV", metrics.hrv || "未確認"],
    ["皮膚温度", metrics.skinTemperature || "未確認"],
    ["ストレス（測定）", metrics.stress || "未確認"],
  ];

  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}

/** 確認済みメトリクスを分析結果に強制反映（モデルが上書きしても戻す） */
function applyConfirmedMetrics(
  analysis: unknown,
  confirmed: AnalysisMetrics,
): unknown {
  if (!analysis || typeof analysis !== "object") return analysis;
  const record = analysis as Record<string, unknown>;
  return { ...record, metrics: confirmed };
}

function formatLifestyle(lifestyle: LifestyleData): string {
  const alcoholDrankLabel =
    lifestyle.alcoholDrank === "none"
      ? "なし"
      : lifestyle.alcoholDrank === "yes"
        ? "あり"
        : lifestyle.alcoholDrank;

  const rows: Array<[string, string | undefined]> = [
    ["対象者名", lifestyle.clientName],
    ["測定日", lifestyle.measurementDate],
    ["ヨガ（実施したか）", formatYesNone(lifestyle.yogaDone, "実施した", "していない")],
    ["ヨガ実施時間（分）", lifestyle.yogaDuration],
    ["ヨガ実施時刻・時間帯", lifestyle.yogaTime],
    ["ヨガ補足", lifestyle.yogaNotes],
    ["ヨガまとめ", lifestyle.yoga],
    [
      "ピラティス（実施したか）",
      formatYesNone(lifestyle.pilatesDone, "実施した", "していない"),
    ],
    ["ピラティス実施時間（分）", lifestyle.pilatesDuration],
    ["ピラティス実施時刻・時間帯", lifestyle.pilatesTime],
    ["ピラティス補足", lifestyle.pilatesNotes],
    ["ピラティスまとめ", lifestyle.pilates],
    [
      "その他の運動（したか）",
      formatYesNone(lifestyle.otherExerciseDone, "した", "していない"),
    ],
    ["その他の運動の種類", lifestyle.otherExerciseName],
    ["その他の運動の実施時間（分）", lifestyle.otherExerciseDuration],
    ["その他の運動の実施時刻・時間帯", lifestyle.otherExerciseTime],
    ["その他の運動の補足", lifestyle.otherExerciseNotes],
    ["その他の運動まとめ", lifestyle.exercise],
    ["入浴", lifestyle.bathing],
    ["飲酒したか", alcoholDrankLabel || lifestyle.alcohol],
    ["飲酒の種類", lifestyle.alcoholType],
    ["飲酒量", lifestyle.alcoholAmount],
    ["飲酒終了時刻", lifestyle.alcoholEndTime],
    ["飲酒の補足（複数種類など）", lifestyle.alcoholNotes],
    ["飲酒まとめ", lifestyle.alcohol],
    [
      "カフェイン（摂取したか）",
      formatYesNone(lifestyle.caffeineDone, "摂取した", "していない"),
    ],
    ["カフェインの種類", formatCaffeineType(lifestyle.caffeineType)],
    ["カフェインの量", lifestyle.caffeineAmount],
    ["カフェインの摂取時刻", lifestyle.caffeineTime],
    ["カフェインの補足", lifestyle.caffeineNotes],
    ["カフェインまとめ", lifestyle.caffeine],
    [
      "主観的ストレス・気分（任意の本人申告。測定ストレスとは別扱い）",
      lifestyle.stress,
    ],
    [
      "朝食（食べたか）",
      formatYesNone(lifestyle.breakfastEaten, "食べた", "食べていない"),
    ],
    ["朝食時間", lifestyle.breakfastTime],
    ["朝食内容", lifestyle.breakfastContent],
    [
      "昼食（食べたか）",
      formatYesNone(lifestyle.lunchEaten, "食べた", "食べていない"),
    ],
    ["昼食時間", lifestyle.lunchTime],
    ["昼食内容", lifestyle.lunchContent],
    [
      "夕食（食べたか）",
      formatYesNone(lifestyle.dinnerEaten, "食べた", "食べていない"),
    ],
    ["夕食時間", lifestyle.dinnerTime],
    ["夕食内容", lifestyle.dinnerContent],
    ["食事まとめ", lifestyle.meals],
    ["仕事", lifestyle.work],
    ["体調", lifestyle.condition],
    ["鼻づまり", lifestyle.nasalCongestion],
    ["自由記述", lifestyle.notes],
  ];

  return rows
    .map(([label, value]) => `${label}: ${value?.trim() ? value.trim() : "未入力"}`)
    .join("\n");
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "AI分析の設定が完了していません。",
        errorType: "Validation Error",
        details: isDev ? "OPENAI_API_KEY is missing." : undefined,
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json(
      {
        error: "リクエスト形式が正しくありません。",
        errorType: "JSON Parse Error",
        details: isDev
          ? parseError instanceof Error
            ? parseError.message
            : String(parseError)
          : undefined,
      },
      { status: 400 },
    );
  }

  const validated = validateBody(body);
  if (!validated.ok) {
    return NextResponse.json(
      {
        error: validated.message,
        errorType: "Validation Error",
        details: isDev ? validated.message : undefined,
      },
      { status: 400 },
    );
  }

  const { lifestyle, images, metrics: confirmedMetrics } = validated;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 280_000,
      maxRetries: 1,
    });

    const metricsBlock = confirmedMetrics
      ? `【確認済みメトリクス（分析の唯一の数値根拠。上書き・推測禁止）】
${formatConfirmedMetrics(confirmedMetrics)}

出力 metrics には上記をそのまま反映すること。空＝未確認。`
      : `【画像解析 — 最大限抽出】
画像に存在する数値・時刻はすべて読み取り、手入力より優先する。推測禁止。読めない項目は ""、sleepScore は null。
抽出対象: 睡眠スコア / 睡眠時間 / 入眠時間 / 起床時間 / 睡眠効率 / 睡眠負債 / 体内時計 / 入眠潜時 / 覚醒時間 / 覚醒率 / REM睡眠 / レム睡眠率 / 浅い睡眠 / 浅い睡眠率 / 深い睡眠 / 深い睡眠率 / 呼吸速度 / 平均SpO₂ / 安静時心拍数 / HRV / 皮膚温度 / ストレス`;

    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `以下の生活習慣データと睡眠データ画像、確認済みメトリクスをもとに、Sleep Wellness Brain™ Version 1 でSWIJレポートを作成してください。一般論ではなく、今回のデータと入力に紐づいた分析にしてください。文章は簡潔で読みやすく。

${metricsBlock}

【レポート構成（この順で書く）】
① summary＝総合評価（2〜4文。良かった点→課題→背景→推移）
② goodPoints＝今回良かった点（≤3）
③ improvements＝改善点（≤2）
④ dataInsight＝睡眠データ考察（3〜5文。metricsに基づく）
⑤ lifestyleRelation＝生活習慣との関係（3〜5文。可能性表現）
⑥ tomorrowPlan＝Tomorrow Plan（≤3。1件目は最優先）

【Brain™ V1 必須】
① 睡眠時間だけで評価しない
② まず良かった点から
③ improvements ≤2
④ tomorrowPlan ≤3、1件目は最優先
⑤ 医療診断しない
⑥ 「可能性があります」を使う
⑦ 単日で結論せず推移確認を促す
⑧ 「睡眠時間を増やして」だけで終わらない
⑨ 入力に応じて提案を変える
⑩ 文章は簡潔。重要文のみ **太字**

【生活習慣データ】
${formatLifestyle(lifestyle)}`,
            },
            ...images.map((imageUrl) => ({
              type: "input_image" as const,
              image_url: imageUrl,
              detail: "high" as const,
            })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "swij_sleep_wellness_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      return NextResponse.json(
        {
          error: "分析結果の取得に失敗しました。",
          errorType: "OpenAI Error",
          details: isDev
            ? "OpenAI response.output_text was empty."
            : undefined,
        },
        { status: 500 },
      );
    }

    let analysis: unknown;
    try {
      analysis = JSON.parse(outputText) as unknown;
    } catch (parseError) {
      console.error("Failed to parse OpenAI analysis JSON", parseError);
      return NextResponse.json(
        {
          error: "分析結果の解析に失敗しました。",
          errorType: "JSON Parse Error",
          details: isDev
            ? parseError instanceof Error
              ? parseError.message
              : String(parseError)
            : undefined,
        },
        { status: 500 },
      );
    }

    if (confirmedMetrics) {
      return NextResponse.json(
        applyConfirmedMetrics(analysis, confirmedMetrics),
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    const details = openaiErrorMessage(error);
    return NextResponse.json(
      {
        error: "AI分析に失敗しました。しばらくしてから再度お試しください。",
        errorType: "OpenAI Error",
        details: isDev ? details : undefined,
      },
      { status: 500 },
    );
  }
}
