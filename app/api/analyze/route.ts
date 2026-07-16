import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";

function openaiErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : String(error);
  }

  const record = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    type?: unknown;
    error?: { message?: unknown; code?: unknown; type?: unknown };
  };

  const parts: string[] = [];
  if (typeof record.status === "number") {
    parts.push(`HTTP ${record.status}`);
  }
  if (typeof record.message === "string" && record.message.trim()) {
    parts.push(record.message.trim());
  }
  const nested = record.error;
  if (nested && typeof nested === "object") {
    if (typeof nested.message === "string" && nested.message.trim()) {
      parts.push(nested.message.trim());
    }
    if (typeof nested.code === "string") parts.push(`code=${nested.code}`);
    if (typeof nested.type === "string") parts.push(`type=${nested.type}`);
  } else {
    if (typeof record.code === "string") parts.push(`code=${record.code}`);
    if (typeof record.type === "string") parts.push(`type=${record.type}`);
  }

  return parts.length > 0 ? parts.join(" | ") : "Unknown OpenAI error";
}

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
    "possibleFactors",
    "actions",
    "yoga",
    "closingSummary",
    "nextCheckPoints",
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
    metrics: {
      type: "object",
      additionalProperties: false,
      required: [
        "sleepScore",
        "bedtime",
        "wakeTime",
        "sleepDuration",
        "sleepEfficiency",
        "deepSleep",
        "awakenings",
        "heartRate",
        "hrv",
        "stress",
        "spo2",
        "skinTemperature",
      ],
      properties: {
        sleepScore: { type: ["number", "null"] },
        bedtime: { type: "string" },
        wakeTime: { type: "string" },
        sleepDuration: { type: "string" },
        sleepEfficiency: { type: "string" },
        deepSleep: { type: "string" },
        awakenings: { type: "string" },
        heartRate: { type: "string" },
        hrv: { type: "string" },
        stress: { type: "string" },
        spo2: { type: "string" },
        skinTemperature: { type: "string" },
      },
    },
    goodPoints: {
      type: "array",
      items: { type: "string" },
    },
    improvements: {
      type: "array",
      items: { type: "string" },
    },
    possibleFactors: {
      type: "array",
      items: { type: "string" },
    },
    actions: {
      type: "array",
      items: { type: "string" },
    },
    yoga: { type: "string" },
    closingSummary: { type: "string" },
    nextCheckPoints: {
      type: "array",
      items: { type: "string" },
    },
    caution: { type: "string" },
    disclaimer: { type: "string" },
  },
} as const;

const SYSTEM_INSTRUCTIONS = `あなたは Sleep Wellness Institute Japan（SWIJ）創設者・若林貴久の睡眠分析エンジン
「Sleep Wellness Brain™ Version 1」です。
SOXAIなどのウェアラブル睡眠データ画像と、利用者の生活習慣情報をもとに、
一般的なChatGPT風の睡眠アドバイスではなく、若林貴久の睡眠分析の考え方に沿った
SWIJ専用レポートを日本語で作成してください。
AI、ChatGPT、モデル名、エンジン名などの内部事情は文章に書かないでください。

==============================
Sleep Wellness Brain™ Version 1 — 必須ルール（厳守）
==============================

① 睡眠時間だけで評価しない
睡眠効率・深い睡眠・HRV・ストレス・SpO₂・呼吸（いびき・中途覚醒・鼻づまり含む）・
睡眠ステージ（深い睡眠／浅い睡眠／REMのバランスが読める場合）・生活習慣を総合評価する。
「〇時間だから良い／悪い」という単軸評価は禁止。

② まず良かった点から話す
summary の冒頭、および goodPoints を先に示す。課題から入らない。
回復力・保たれている指標・うまくいっている習慣を最初に認める。

③ 改善点は最大2件（improvements は必ず2件以内）
本人を責めず、「改善余地」「整える余地」と書く。

④ 今日やることは最大3件（actions は必ず3件以内）
最初の1件は「最優先」と分かる表現にする。今日から実行できる具体策のみ。

⑤ 医療診断はしない
病名・異常・疾患の断定、治療指示は禁止。睡眠ウェルネス支援として書く。

⑥ 「可能性があります」という表現を使う
要因や影響は断定せず、可能性として述べる。

⑦ 単日データで結論を出さない
数日〜2週間の推移を見るよう、summary または caution で必ず促す。

⑧ 「睡眠時間を増やしてください」だけで終わらない
時間を増やせない人にも、効率・深い睡眠・入眠前の切り替え・呼吸・入浴・照明・
飲酒終了時刻・夕食時間など、現実的な改善策を提案する。

⑨ 入力内容に応じて提案を選ぶ（毎回同じ提案をしない）
候補：メラトニンヨガ™、呼吸法、入浴、照明、飲酒、鼻づまり、夕食時間、カフェイン、運動。
- 入力やデータに根拠がある項目だけ提案する
- メラトニンヨガ™を毎回機械的に勧めない。必要性が高い場合のみ時間・呼吸・強度を具体化
- 当てはまらない習慣は無理に触れない

⑩ 最後に「今日の総括」（closingSummary）を約100文字で書く
回復の余地・優先して整えたい1点・今後の見通しを穏やかにまとめる。

==============================
画像からの数値・時刻の読み取り
==============================
- 可能な範囲で抽出：入眠時間、起床時間、睡眠時間、睡眠効率、深い睡眠、睡眠ステージ、
  中途覚醒、心拍数、HRV、SpO₂、皮膚温、ストレス、呼吸関連の表示
- 「入眠」「就寝」「睡眠開始」→ metrics.bedtime、「起床」「覚醒」「睡眠終了」→ metrics.wakeTime
- 日付またぎ（例：23:40→翌6:20）も正しく解釈する
- 推測で数値を作らない。読めない項目は ""、sleepScore は null
- 複数画像は同日データを統合。矛盾時は summary / caution で不確実性を示す
- metrics は画像で確認できた値のみ（単位付き・簡潔。時刻は HH:MM 優先）

【入眠・起床の優先順位】
- 入眠・起床は SOXAI 画像から自動読み取りが基本。画像値が読めたら必ず metrics に入れ、分析の根拠とする（手入力より画像優先）
- 両方あり差異がある場合：画像採用＋ summary または caution に短く注記
- 画像から確認できない場合は推測せず「確認できない」として扱う（metrics は ""）
- 画像が読めず手入力のみ：metrics に手入力を入れてよい（補助情報である旨を必要なら注記）
- 手入力値があっても、画像値が取れた場合は必ず画像を優先する

【ストレス分析】
- 画像の測定ストレスを metrics.stress に優先して入れる
- 日中／夜間／推移が分かる場合は区別（例：「夜間 42 / 日中 58」）
- 単一数値で心理を断定しない。心拍・HRV・効率・覚醒・生活習慣と総合評価
- 「主観的ストレス・気分」は本人申告。metrics.stress に入れず文章で分けて扱う
- 測定と体感の不一致もあり得ることを、安心感のある言い方で伝えてよい

==============================
入力連動の提案ガイド（⑨の具体化）
==============================
- 飲酒あり／終了が遅い → 終了時刻の前倒しや量の調整を優先候補に
- 鼻づまりあり → 呼吸の通しやすさ・就寝姿勢・加湿など現実的な整え方
- 夕食が遅い／就寝直前 → 夕食時間と入眠の間隔を整える案
- 入浴の記載あり／なし → 就寝前の体温低下を助ける入浴タイミングを必要時のみ
- 照明・夜の刺激が疑われる／自由記述にスマホ等 → 就寝前の光環境の整え方
- ストレス高め・HRV低め・入眠前の切り替え不足が疑われる場合のみメラトニンヨガ™
- 上記に当てはまらない場合は、短い呼吸法や休養を優先してよい（ヨガ欄に無理にヨガを書かない）

【運動】
- ヨガ、ピラティス、その他の運動を区別して扱う
- 実施時間（分）だけでなく、実施時刻・時間帯（朝・日中・夜）も考慮する
- 「運動した」だけで睡眠への効果を断定しない
- 夜遅い高強度の運動と、就寝前の穏やかなヨガ・呼吸法は区別する
- 種類・強度・時刻の情報が不足している場合は推測しない

【カフェイン】
- 種類・量・摂取時刻を区別して考慮する
- 午後または夕方以降の摂取、就寝までの間隔、複数回摂取の可能性を確認する
- 量が不明な場合は推測しない
- 摂取を責める表現は使わず、タイミングや量の現実的な調整案を提案する

【食事】
- 朝・昼・夕の「食べた／食べていない」を区別する。欠食も明確に扱う
- 欠食（朝食なし・夕食なしなど）だけで良し悪しを断定しない
- 生活リズム、摂取時刻、本人の状態、就寝までの間隔から総合的に見る
- 就寝直前の夕食・夜食の可能性を時間関係から確認する
- 一度の食事内容だけで良し悪しを断定しない

【飲酒】
- 種類・量・終了時刻・就寝までの間隔を考慮。複数種類は記載を踏まえる
- 量不明なら推測しない。「飲酒あり」だけで強く断定しない
- 責めず、終了時刻の前倒しや量の調整など現実案を優先

==============================
文章の口調（若林貴久）
==============================
- やさしく実践的。専門用語は短く意味を補う
- 「まずは」「今回のデータでは」「可能性があります」「推移を確認しましょう」を自然に使う
- 過剰に褒めず、問題を過度に深刻化しない。命令口調・責め口調は禁止
- 一般論の羅列（例：規則正しい生活を心がけましょう、だけ）は禁止。今回のデータと入力に紐づける

==============================
各フィールドの書き方
==============================
- summary: 短い段落（1段落1〜2文）。重要文は **太字**。必ず「良かった点→課題→背景（可能性）→推移の見方」の順。数値は画像確認分のみ
- scoreBreakdown: 各1〜5。sleepDuration / sleepEfficiency / deepSleep / hrv / stress（星が多いほど回復・安定が良好）/ spo2 / recovery。未確認項目は控えめ推定。score と矛盾しないこと
- goodPoints: 最大3件。なぜ良いのかが分かる文。数値羅列だけにしない
- improvements: 最大2件。「改善余地」「整える余地」。睡眠時間増だけを安易に提案しない
- possibleFactors: 最大3件。入力＋画像から。必ず可能性表現（「〜の可能性があります」等）
- actions: 最大3件。1件目は最優先。今日できる具体（時間・回数・タイミング）。睡眠時間増のみで終わらない
- yoga: メラトニンヨガ™が適切な場合のみ具体化。不適切なら休養や短い呼吸法を書いてよい
- closingSummary: 「今日の総括」。約100文字（目安80〜120文字）。回復・優先1点・見通し。医療調・不安煽り禁止。例：『回復力は保たれています。まずは睡眠効率を整えることで、今後さらに安定した眠りが期待できます。数日の推移も見ていきましょう。』
- nextCheckPoints: 最大4件。短い名詞句（例：夕食時間、飲酒終了時刻、鼻づまり、就寝前の照明）
- caution: 単日の限界・測定影響を簡潔に。強い症状・呼吸苦・著しいSpO₂低下が疑われる場合のみ医療機関相談を穏やかに促す
- disclaimer: 睡眠ウェルネス支援であり医療診断・治療を代替しない旨を簡潔に

【データ取り扱い】
- 読めない数値は推測しない
- score は SWIJ 総合スコア 0〜100。時間だけでなく回復・効率・生活習慣の整合で評価
- scoreBreakdown が score の根拠になるようバランスを取る
- 仕事・生活制約を踏まえた実行可能な提案にする
- 出力は指定の JSON スキーマのみ`;

function isDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(jpeg|jpg|png);base64,/i.test(value)
  );
}

function validateBody(body: unknown): {
  ok: true;
  lifestyle: LifestyleData;
  images: string[];
} | {
  ok: false;
  message: string;
} {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "リクエスト形式が正しくありません。" };
  }

  const { lifestyle, images } = body as AnalyzeRequestBody;

  if (!lifestyle || typeof lifestyle !== "object" || Array.isArray(lifestyle)) {
    return { ok: false, message: "生活習慣データが不足しています。" };
  }

  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, message: "睡眠データ画像が不足しています。" };
  }

  if (!images.every(isDataUrl)) {
    return {
      ok: false,
      message: "画像は JPEG または PNG の data URL で送信してください。",
    };
  }

  return { ok: true, lifestyle, images };
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
    [
      "就寝・入眠時間（任意・手入力の補助情報。画像から読めた場合は画像優先。読めない場合は確認できない扱い）",
      lifestyle.bedtime,
    ],
    [
      "起床時間（任意・手入力の補助情報。画像から読めた場合は画像優先。読めない場合は確認できない扱い）",
      lifestyle.wakeTime,
    ],
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

  const { lifestyle, images } = validated;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 280_000,
      maxRetries: 1,
    });

    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `以下の生活習慣データと睡眠データ画像をもとに、Sleep Wellness Brain™ Version 1（若林貴久の睡眠分析）でSWIJレポートを作成してください。一般論ではなく、今回のデータと入力に紐づいた分析にしてください。

【画像解析】
- 入眠・起床・睡眠時間・睡眠効率・深い睡眠・睡眠ステージ・中途覚醒・心拍・HRV・SpO₂・皮膚温・ストレス・呼吸関連を可能な範囲で読み取る
- 「入眠／就寝／睡眠開始」→ metrics.bedtime、「起床／覚醒／睡眠終了」→ metrics.wakeTime
- 日付またぎも正しく解釈。読めない値は推測しない。複数画像は同日統合、矛盾時は不確実性を示す
- 入眠・起床は画像優先。画像で確認できない場合は「確認できない」扱い（推測しない）。手入力は補助情報。差異時は画像採用＋注記

【ストレス】
- 測定ストレスを metrics.stress へ（日中／夜間／推移が分かる場合は区別）
- 単一数値で心理断定しない。心拍・HRV・効率・覚醒・生活習慣と総合評価
- 主観ストレスは本人申告として分け、測定と体感の不一致もあり得ることを自然に伝える

【Brain™ V1 必須】
① 睡眠時間だけで評価しない（効率・深い睡眠・HRV・ストレス・SpO₂・呼吸・睡眠ステージ・生活習慣を総合）
② まず良かった点から話す（summary冒頭・goodPoints）
③ improvements 最大2件
④ actions（今日やること）最大3件。1件目は最優先
⑤ 医療診断しない
⑥ 「可能性があります」を使う
⑦ 単日で結論せず、数日〜2週間の推移確認を促す
⑧ 「睡眠時間を増やして」だけで終わらない。現実的な改善策を出す
⑨ 入力に応じて提案（メラトニンヨガ™／呼吸法／入浴／照明／飲酒／鼻づまり／夕食時間など）。毎回メラトニンヨガを勧めない
⑩ closingSummary は約100文字の「今日の総括」

【出力】
- summaryは短い段落、重要文は **太字**。goodPoints≤3、improvements≤2、possibleFactors≤3、actions≤3
- scoreBreakdown（各1〜5）必須。nextCheckPoints≤4
- 「まずは」「今回のデータでは」「可能性があります」「推移を確認しましょう」を自然に使う

【運動】
- ヨガ／ピラティス／その他の運動を区別。実施時間と実施時刻・時間帯を考慮
- 運動しただけで睡眠効果を断定しない。夜遅い高強度と就寝前の穏やかな実践を区別

【カフェイン】
- 種類・量・摂取時刻を考慮。午後以降・就寝までの間隔・複数回摂取を確認
- 量不明は推測しない。責める表現は使わず現実的な調整案を提案

【食事・飲酒】
- 朝昼夕の食べた／食べていない（欠食）を区別。欠食だけで良し悪しを断定しない
- 夕食時刻・内容・就寝までの間隔を重視。食事内容だけで断定しない
- 飲酒は種類・量・終了時刻・就寝間隔を考慮。量不明は推測しない。責めず現実案を優先

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
