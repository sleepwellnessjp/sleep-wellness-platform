import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  metricsJsonSchema,
  normalizeImageDataUrl,
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
    "sleepCharacteristics",
    "improvements",
    "actionPlan",
    "melatoninYoga",
    "score",
    "scoreBreakdown",
    "metrics",
    "caution",
    "disclaimer",
  ],
  properties: {
    summary: { type: "string" },
    sleepCharacteristics: { type: "string" },
    improvements: {
      type: "array",
      items: { type: "string" },
    },
    actionPlan: {
      type: "array",
      items: { type: "string" },
    },
    melatoninYoga: { type: "string" },
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
    caution: { type: "string" },
    disclaimer: { type: "string" },
  },
} as const;

const SYSTEM_INSTRUCTIONS = `あなたは Sleep Wellness Platform 専用の睡眠分析エンジンです。
Sleep Wellness Institute Japan（SWIJ）創設者・若林貴久の睡眠ウェルネス思想に基づき、
確認済みの SOXAI 睡眠データと生活習慣入力を総合して、日本語レポートを作成してください。
AI、ChatGPT、モデル名、テンプレート文章などの内部事情は文章に書かないでください。
一般論のテンプレート回答は禁止。今回のデータと入力にのみ紐づけて書いてください。

==============================
絶対禁止事項（厳守）
==============================

① 単日データだけで断定しない
- 「ストレスがかかっている」「呼吸は安定している」「回復できている」などの断定は禁止
- 必ず「今回のデータでは〜の可能性があります」「単日のため推移の確認が大切です」など穏やかに書く
- summary または caution で、数日〜2週間の推移を見るよう必ず促す

② 測定できていない項目・基準値が不明な項目を推測しない
- 空・未確認の項目の状態を「おそらく」「一般的には」などで埋めない
- 個人の基準値（ベースライン）が無い指標は、絶対値だけで良し悪しを断定しない

③ HRV の単独断定禁止
- 例：HRV 50ms だけを根拠に「ストレスがかかっている」と断定してはならない
- HRV は参考値として触れてもよいが、他指標・生活習慣・推移なしにストレス断定は禁止

④ SpO₂ の単独断定禁止
- 例：SpO₂ 94% だけを根拠に「呼吸は安定している」と断定してはならない
- SpO₂ も単独で安心・危険を断定せず、確認できた事実として数値を述べるにとどめる

⑤ 不足項目の明示文言
- 値が空・未確認の項目は、文章中で必ず
  「今回の画像では確認できませんでした」
  と明記する（短縮形「確認できませんでした」でも可だが、意味は同じ）

⑥ 医療診断・治療表現は禁止
- 病名・異常・疾患の断定、治療指示は使わない。睡眠ウェルネス支援として書く

⑦ 「可能性があります」を使う
- 要因や影響は断定せず、可能性として述べる

⑧ 「睡眠時間を増やしてください」だけで終わらない
- 効率・ステージ・入眠前の切り替え・入浴・照明・飲酒終了・夕食時間など現実的な策を書く

⑨ 文章は簡潔
- 1文は短く。同じ内容の繰り返しを避ける。重要文のみ **太字**

==============================
確認済みメトリクスの扱い
==============================
ユーザーが確認・確定したメトリクスが渡された場合、それを分析の唯一の数値根拠とする。
画像の再読取で上書きしない。空文字の項目は「今回の画像では確認できませんでした」扱い。
出力 JSON の metrics には、確認済みメトリクスをそのまま入れる。

【ストレス】
- 測定ストレスは metrics.stress
- 「主観的ストレス・気分」は本人申告。metrics.stress に混ぜず、文章で分けて扱う
- metrics.stress が空なら、HRV などからストレス状態を推測して埋めない

==============================
レポート構成（この5項目を必ずこの順で生成。空欄禁止）
==============================

① summary（総合評価）
  3〜5文。
  - 良かった点を先に伝える
  - 改善が必要な点を、確認できた数値とともに説明する
  - 単日評価であることを踏まえて穏やかに表現する
  - 睡眠スコア単体で結論を出さない。確認できた複数指標＋生活習慣を総合する
  - 不足がある場合は「〇〇は今回の画像では確認できませんでした」と明示

② sleepCharacteristics（睡眠の特徴）
  3〜8文。次の候補のうち「取得できた項目だけ」を使い、数値を具体的に書く:
  - 睡眠時間 / 睡眠効率 / 入眠潜時 / 睡眠負債 / 体内時計
  - 覚醒率（または覚醒時間）
  - REM・浅い睡眠・深い睡眠（時間または割合）
  - SpO₂ / 安静時心拍数 / HRV
  取得できなかった項目は「今回の画像では確認できませんでした」と書くか、触れない。
  取得できていない項目について推測で特徴を書かない。

③ improvements（改善ポイント）
  最大3件の配列。優先順位が分かるように書く（例：「優先1：…」「優先2：…」）。
  抽象的な助言禁止。今回確認できた数値に対応した内容のみ。
  「改善余地」「整える余地」の表現。本人を責めない。

④ actionPlan（今日から実践する3つの行動）
  必ず3件。1件目は最優先と分かる表現。
  具体的で実行可能（時間・回数・タイミング）。
  就寝時刻・デジタル機器・入浴・飲酒・食事・運動などから、入力データに合うものを選ぶ。
  生活習慣データが乏しい／未入力の場合は、その情報がないことを踏まえた提案にする
  （例：「生活習慣の詳細入力が少ないため、まずは就寝前の切り替えから」）。

⑤ melatoninYoga（メラトニンヨガ™の推奨内容）
  必ず空欄にせず生成する。2〜4文。
  今回のデータに合う内容にする。医療診断・治療のような表現は使わない。

  【例：睡眠時間が短い／睡眠効率が低め／体内時計にずれがある場合】
  「就寝前10分のメラトニンヨガ™を推奨します。
  前半3分はゆっくりとした動き、次に3:6呼吸を5分、最後に静かな休息を2分行います。
  無理に眠ろうとせず、呼吸と身体感覚を整えることを目的とします。」

  データに応じて内容・時間配分・焦点を変えること（毎回同じ定型文は禁止）。
  - 入眠潜時が長め → 呼吸と休息の比重を厚めに
  - 覚醒率が高め → ゆるやかな動きと身体感覚の比重を厚めに
  - 測定ストレスが高め／主観ストレスの申告あり → 静かな休息と3:6呼吸を中心に
  - データ不足で判断しにくい場合でも、空欄にせず控えめな10分導入を提案する

- caution: 単日の限界を簡潔に。強い症状・呼吸苦などが疑われる場合のみ医療機関相談を穏やかに促す
- disclaimer: 睡眠ウェルネス支援であり医療診断・治療を代替しない旨を簡潔に
- scoreBreakdown: 各1〜5。未確認項目は控えめ。score と矛盾しないこと
- score: Sleep Wellness 総合スコア 0〜100（睡眠スコアのコピー禁止。総合評価）

==============================
生活習慣との連動ガイド
==============================
- 飲酒あり／終了が遅い → 終了時刻の前倒しや量の調整の可能性
- 食事（遅い夕食・欠食） → 入眠との間隔の可能性（欠食だけで断定しない）
- 運動／ヨガ／ピラティス → 実施時刻と回復の関係（効果は断定しない）
- 仕事の負荷・長時間 → 入眠前の切り替え不足の可能性
- カフェイン（午後以降） → 入眠潜時・浅い睡眠への影響の可能性
- 当てはまらない習慣・未入力は無理に触れない

==============================
文章の口調
==============================
- やさしく実践的。専門用語は短く意味を補う
- 「まずは」「今回のデータでは」「可能性があります」「推移を確認しましょう」を自然に使う
- 過剰に褒めず、問題を過度に深刻化しない。命令口調・責め口調は禁止
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
      message:
        "画像は JPEG / PNG / WEBP の data URL で送信してください。",
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
  const missing = "今回の画像では確認できませんでした";
  const rows: Array<[string, string]> = [
    [
      "睡眠スコア",
      metrics.sleepScore == null ? missing : String(metrics.sleepScore),
    ],
    ["QoL", metrics.qol || missing],
    ["昨日のスコア", metrics.yesterdayQol || missing],
    ["体調スコア", metrics.conditionScore || missing],
    ["睡眠時間", metrics.sleepDuration || missing],
    ["入眠時間", metrics.bedtime || missing],
    ["起床時間", metrics.wakeTime || missing],
    ["睡眠効率", metrics.sleepEfficiency || missing],
    ["覚醒時間", metrics.awakenings || missing],
    ["覚醒率", metrics.awakeningRate || missing],
    ["REM睡眠", metrics.remSleep || missing],
    ["レム睡眠率", metrics.remSleepRate || missing],
    ["浅い睡眠", metrics.lightSleep || missing],
    ["浅い睡眠率", metrics.lightSleepRate || missing],
    ["深い睡眠", metrics.deepSleep || missing],
    ["深い睡眠率", metrics.deepSleepRate || missing],
    ["睡眠負債", metrics.sleepDebt || missing],
    ["入眠潜時", metrics.sleepLatency || missing],
    ["体内時計", metrics.circadianRhythm || missing],
    ["呼吸速度", metrics.respiratoryRate || missing],
    ["平均SpO₂", metrics.spo2 || missing],
    ["安静時心拍数", metrics.restingHeartRate || missing],
    ["HRV", metrics.hrv || missing],
    ["皮膚温度", metrics.skinTemperature || missing],
    ["ストレス（測定）", metrics.stress || missing],
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
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "AI分析APIの設定が完了していません。.env.local に OPENAI_API_KEY を設定し、開発サーバーを再起動してください。",
        errorType: "Config Error",
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

  const lifestyle = validated.lifestyle;
  const images = validated.images.map(normalizeImageDataUrl);
  const confirmedMetrics = validated.metrics;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 280_000,
      maxRetries: 1,
    });

    const metricsBlock = confirmedMetrics
      ? `【確認済みメトリクス（分析の唯一の数値根拠。上書き・推測禁止）】
${formatConfirmedMetrics(confirmedMetrics)}

出力 metrics には上記をそのまま反映すること。
「今回の画像では確認できませんでした」の項目は推測で埋めず、文章でも同じ文言で明示する。`
      : `【画像解析 — 最大限抽出】
画像に存在する数値・時刻はすべて読み取り、手入力より優先する。推測禁止。読めない項目は ""、sleepScore は null。
抽出対象: 睡眠スコア / 睡眠時間 / 入眠時間 / 起床時間 / 睡眠効率 / 睡眠負債 / 体内時計 / 入眠潜時 / 覚醒時間 / 覚醒率 / REM睡眠 / レム睡眠率 / 浅い睡眠 / 浅い睡眠率 / 深い睡眠 / 深い睡眠率 / 呼吸速度 / 平均SpO₂ / 安静時心拍数 / HRV / 皮膚温度 / ストレス`;

    const response = await client.responses.create({
      model: "gpt-4o",
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `以下の確認済み睡眠データと生活習慣入力をもとに、Sleep Wellness Platform 専用の分析ロジックでレポートを作成してください。
テンプレート文章は禁止。単日データで断定しない。確認できた指標と生活習慣だけを使う。

${metricsBlock}

【必ずこの5項目を空欄なく生成】
① summary＝総合評価（良かった点→数値つき改善点。単日として穏やかに）
② sleepCharacteristics＝睡眠の特徴（取得できた項目の数値のみ。未取得は「今回の画像では確認できませんでした」）
③ improvements＝改善ポイント（優先順位つき最大3件。今回の数値に対応）
④ actionPlan＝今日から実践する3つの行動（必ず3件。入力習慣に合わせる。未入力ならその旨を踏まえる）
⑤ melatoninYoga＝メラトニンヨガ™推奨（必ず生成。時間配分・呼吸・休息を具体的に。データに応じて変える）

【絶対禁止】
- HRV 単独で「ストレスがかかっている」と断定しない
- SpO₂ 単独で「呼吸は安定している」と断定しない
- 未測定・基準不明の項目を推測で埋めない
- 医療診断・治療表現を使わない
- 単日だけで結論しない。「可能性があります」を使う

【生活習慣データ（食事・運動・飲酒・入浴・カフェイン・仕事を参照）】
${formatLifestyle(lifestyle)}`,
            },
            ...(confirmedMetrics
              ? []
              : images.map((imageUrl) => ({
                  type: "input_image" as const,
                  image_url: imageUrl,
                  detail: "high" as const,
                }))),
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
