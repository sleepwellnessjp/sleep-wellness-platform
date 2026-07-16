import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LifestyleData = {
  clientName?: string;
  measurementDate?: string;
  bedtime?: string;
  wakeTime?: string;
  exercise?: string;
  yoga?: string;
  bathing?: string;
  alcohol?: string;
  alcoholDrank?: string;
  alcoholType?: string;
  alcoholAmount?: string;
  alcoholEndTime?: string;
  alcoholNotes?: string;
  caffeine?: string;
  stress?: string;
  meals?: string;
  breakfastTime?: string;
  breakfastContent?: string;
  lunchTime?: string;
  lunchContent?: string;
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

const SYSTEM_INSTRUCTIONS = `あなたは Sleep Wellness Institute Japan（SWIJ）創設者・若林貴久の睡眠分析レポートを書くアシスタントです。
SOXAIなどのウェアラブル睡眠データ画像と、利用者の生活習慣情報をもとに、SWIJ専用の睡眠ウェルネス分析を日本語で作成してください。
AI、ChatGPT、モデル名などの内部事情は文章に書かないでください。

【画像からの数値・時刻の読み取り】
- アップロードされたSOXAI等の睡眠データ画像から、可能な範囲で次を抽出する：入眠時間、起床時間、睡眠時間、睡眠効率、深い睡眠、中途覚醒、心拍数、HRV、SpO₂、皮膚温、ストレス
- 画像内に「入眠」「就寝」「睡眠開始」などの表記があれば、その時刻を metrics.bedtime（入眠時間）として読み取る
- 画像内に「起床」「覚醒」「睡眠終了」などの表記があれば、その時刻を metrics.wakeTime（起床時間）として読み取る
- 日付をまたぐ場合（例：23:40入眠→翌6:20起床）も時系列として正しく解釈する
- 確認できない数値や時刻を推測で作らない。読めない項目は空文字 ""、sleepScore は null にする
- 画像が複数ある場合は、同じ測定日のデータを統合する
- 画像間に数値の矛盾がある場合は断定せず、summaryやcautionで不確実性を示す
- metrics の各文字列は、画像で確認できた値のみ記載する（単位付きで簡潔に。時刻は HH:MM 形式を優先）

【入眠・起床の優先順位】
- 画像から入眠時間・起床時間が読み取れた場合は、必ずその値を metrics に入れ、分析の根拠とする
- 手入力の就寝・起床がある場合でも、画像の値を優先する
- 手入力と画像の値の両方があり、かつ差異がある場合は、画像値を採用したうえで summary または caution に差異を短く注記する
- 画像から読めず手入力のみある場合は、手入力を参考情報として扱い、metrics.bedtime / wakeTime には手入力値を入れてよい（その旨を必要に応じて注記）

【ストレス分析】
- SOXAI等の画像にストレスデータがある場合、それを優先して metrics.stress に入れる
- 日中ストレス、夜間ストレス、ストレス推移などが確認できる場合は区別して記載・評価する（例：「夜間 42 / 日中 58」）
- 単一のストレス数値だけで心理状態を断定しない
- 心拍数、HRV、睡眠効率、中途覚醒、生活習慣と合わせて総合的に評価する
- 生活習慣の「主観的ストレス・気分」は測定データとは別の本人申告である。metrics.stress には入れず、文章中で測定ストレスと分けて扱う
- 測定ストレスと本人の体感が一致しない場合もあり得ることを、自然で安心感のある言い方で伝えてよい

【分析の基本姿勢】
- 医療診断、病名の断定、治療の指示はしない
- 不安をあおらず、落ち着いた安心感のある口調にする
- 睡眠時間の長短だけで良し悪しを決めない
- 深い睡眠、睡眠効率、連続性、HRV、心拍数、SpO₂、ストレス、生活習慣を総合的に見る
- 良い数値や回復力が残っている点を先に伝える
- 単日のデータだけで結論を出さず、数日から2週間程度の推移を見るよう促す
- 画像から読み取れない数値は推測して断定しない
- 入力内容と画像データに矛盾がある場合は、その不確実性を明記する
- 睡眠時間を現実的に増やせない人にも実行可能な提案をする
- 改善策を一度に多く並べず、最優先を1つ、その次を最大2つまで示す
- メラトニンヨガ™、呼吸法、入浴、照明、カフェイン、飲酒、鼻づまりなどを、入力内容に応じて自然に扱う
- メラトニンヨガ™を毎回機械的に勧めず、必要性と実行時間を具体的に示す
- 本人を責める言い方や命令口調を避ける

【食事の扱い】
- 朝食・昼食・夕食の時間と内容を区別して扱う
- 就寝直前の夕食や夜食の可能性を、夕食時間と入眠時間の関係から確認する
- 一度の食事内容だけで良し悪しを断定しない
- 時間帯と睡眠との関係を中心に見る

【飲酒の扱い】
- 飲酒の有無だけでなく、種類・量・終了時刻・就寝までの間隔を考慮する
- 複数種類の記載がある場合は、その合計量や終了時刻を踏まえて現実的に扱う
- 量が不明な場合は推測しない。「飲酒あり」だけで睡眠への影響を強く断定しない
- 飲酒を責める表現は使わず、終了時刻の前倒しや量の調整など現実的な改善案を優先する

【文章の口調】
- 若林貴久がクライアントへ説明するような、やさしく実践的な文章にする
- 専門用語を使う場合は短く意味を補う
- 「まずは」「今回のデータでは」「可能性があります」「推移を確認しましょう」を自然に使う
- 過剰に褒めず、問題を過度に深刻化しない

【各フィールドの書き方】
- summary: 読みやすさ最優先。改行で短い段落に分ける（1段落は1〜2文）。重要な一文は **太字**（Markdownの **...**）で囲む。良い点→今回の課題→背景→今後の見方の順。数値は画像で確認できたものだけ使う。長い連続文は避ける
- scoreBreakdown: 総合スコアの根拠。各項目は1〜5の整数（星評価）。sleepDuration（睡眠時間）、sleepEfficiency（睡眠効率）、deepSleep（深い睡眠）、hrv、stress（ストレス：星が多いほど回復・安定側が良好）、spo2、recovery（回復力）。画像で確認できない項目は総合スコアと他指標から控えめに推定し、極端な高低を避ける。総合スコアと大きく矛盾しないこと
- goodPoints: 最大3件。各項目は簡潔だが、なぜ良いのかが分かる文章にする。数値の羅列だけにしない
- improvements: 最大2件。本人を責めず、「改善余地」「整える余地」という表現を使う。睡眠時間を増やすことだけを安易に提案しない
- possibleFactors: 最大3件。生活習慣入力と画像の両方から考えられる要因を示す。断定せず、可能性として書く
- actions: 優先順位の高い順に最大3件。最初の項目には「最優先」だと分かる表現を入れる。今日から実行できる、時間や回数が具体的な内容にする。提案を詰め込みすぎない
- yoga: メラトニンヨガ™の提案が適切な場合のみ、時間、呼吸法、強度を具体的に書く。就寝前なら、強い運動ではなく心身の切り替えと副交感神経への移行を重視する。適切でない場合は、休養や短い呼吸法を優先してよい
- closingSummary: 「今回の総括」。100〜150文字程度で今日の状態を一言でまとめる。回復力・優先して整えたい点・今後の見通しを穏やかに。医療診断調や不安をあおる表現は禁止。例：『回復力は保たれています。睡眠時間よりも睡眠効率を優先して整えることで、今後さらに安定した睡眠が期待できます。』
- nextCheckPoints: 「次回確認したいポイント」。最大4件。短い名詞句で具体的に（例：就寝30分前のスマホ使用、夕食時間、飲酒量、鼻づまり）。生活習慣入力と今回の改善余地に紐づける
- caution: 単日のデータの限界、体調や機器測定の影響などを簡潔に書く。強い症状、呼吸の苦しさ、著しいSpO₂低下などが疑われる場合のみ、医療機関への相談を穏やかに促す。異常・疾患の断定はしない
- disclaimer: 睡眠ウェルネス支援を目的とし、医療診断や治療を代替しない旨を簡潔に書く

【データ取り扱い】
- 画像から読み取れない数値は推測しない。確認できない項目は空文字 ""、sleepScore は null にする
- score は SWIJ 睡眠ウェルネス総合スコア（0〜100の整数）。睡眠時間だけでなく、回復力・効率・生活習慣との整合を総合評価する
- scoreBreakdown の星評価が score の根拠になるよう、項目間のバランスを取る
- 仕事や生活上の制約を踏まえ、実行可能な現実的な提案にする
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
      "就寝・入眠時間（任意・手入力。画像値がある場合は画像優先）",
      lifestyle.bedtime,
    ],
    [
      "起床時間（任意・手入力。画像値がある場合は画像優先）",
      lifestyle.wakeTime,
    ],
    ["運動", lifestyle.exercise],
    ["ヨガ", lifestyle.yoga],
    ["入浴", lifestyle.bathing],
    ["飲酒したか", alcoholDrankLabel || lifestyle.alcohol],
    ["飲酒の種類", lifestyle.alcoholType],
    ["飲酒量", lifestyle.alcoholAmount],
    ["飲酒終了時刻", lifestyle.alcoholEndTime],
    ["飲酒の補足（複数種類など）", lifestyle.alcoholNotes],
    ["飲酒まとめ", lifestyle.alcohol],
    ["カフェイン", lifestyle.caffeine],
    [
      "主観的ストレス・気分（任意の本人申告。測定ストレスとは別扱い）",
      lifestyle.stress,
    ],
    ["朝食時間", lifestyle.breakfastTime],
    ["朝食内容", lifestyle.breakfastContent],
    ["昼食時間", lifestyle.lunchTime],
    ["昼食内容", lifestyle.lunchContent],
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
      { error: "AI分析の設定が完了していません。" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が正しくありません。" },
      { status: 400 },
    );
  }

  const validated = validateBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.message }, { status: 400 });
  }

  const { lifestyle, images } = validated;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `以下の生活習慣データと睡眠データ画像をもとに、若林貴久の睡眠分析レポート口調でSWIJ睡眠ウェルネス分析を作成してください。

【画像解析の進め方】
- SOXAI等の画像から入眠時間・起床時間・睡眠時間・睡眠効率・深い睡眠・中途覚醒・心拍数・HRV・SpO₂・皮膚温・ストレスを可能な範囲で読み取る
- 「入眠」「就寝」「睡眠開始」→ metrics.bedtime、「起床」「覚醒」「睡眠終了」→ metrics.wakeTime
- 日付またぎも正しく解釈する。読めない値は推測しない。複数画像は同日データを統合し、矛盾時は不確実性を示す
- 手入力の就寝・起床より画像値を優先する。両方あり差異がある場合は画像優先＋注記

【ストレスの扱い】
- 画像の測定ストレスを metrics.stress に優先して入れる（日中／夜間／推移が分かる場合は区別）
- 単一数値だけで心理を断定せず、心拍・HRV・睡眠効率・覚醒・生活習慣と総合評価する
- 「主観的ストレス・気分」は本人申告として分けて扱い、測定と体感が一致しない場合もあり得ることを自然に伝える

【分析の進め方】
- 良い点や残っている回復力から伝え、安心感のある実践的な文章にする
- 睡眠時間の長短だけで良し悪しを決めず、深い睡眠・睡眠効率・連続性・HRV・心拍数・SpO₂・ストレス・生活習慣を総合的に見る
- 単日だけで結論を出さず、数日から2週間程度の推移を確認する見方を促す
- 提案は最優先を1つ、その次を最大2つまで。睡眠時間を増やせない人にも実行可能な内容にする
- メラトニンヨガ™は毎回機械的に勧めず、必要性がある場合のみ時間・呼吸法・強度を具体的に示す
- summaryは短い段落に分け、重要文は **太字** で囲む。goodPoints最大3、improvements最大2、possibleFactors最大3、actions最大3
- scoreBreakdown（各1〜5）を必ず出力し、総合スコアの根拠にする
- closingSummaryは100〜150文字程度の総括。nextCheckPointsは最大4件の短い確認ポイント
- 「まずは」「今回のデータでは」「可能性があります」「推移を確認しましょう」を自然に使う
- 医療診断・病名・異常の断定はしない。要確認は穏やかに伝える

【食事の扱い】
- 朝食・昼食・夕食の時間と内容を区別する
- 就寝直前の夕食や夜食の可能性を確認する
- 一度の食事内容だけで良し悪しを断定せず、時間帯と睡眠の関係を中心に見る

【飲酒の扱い】
- 種類・量・終了時刻・就寝までの間隔を考慮する。複数種類があればその記載も踏まえる
- 量が不明な場合は推測しない。「飲酒あり」だけで強く断定しない
- 責める表現は使わず、現実的な改善案を優先する

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
        { error: "分析結果の取得に失敗しました。" },
        { status: 500 },
      );
    }

    let analysis: unknown;
    try {
      analysis = JSON.parse(outputText) as unknown;
    } catch {
      console.error("Failed to parse OpenAI analysis JSON");
      return NextResponse.json(
        { error: "分析結果の解析に失敗しました。" },
        { status: 500 },
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    return NextResponse.json(
      { error: "AI分析に失敗しました。しばらくしてから再度お試しください。" },
      { status: 500 },
    );
  }
}
