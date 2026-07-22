import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  metricsJsonSchema,
  normalizeImageDataUrl,
  openaiErrorMessage,
} from "@/lib/openai-helpers";
import { normalizeMetrics, type AnalysisMetrics } from "@/lib/analysis-session";
import type { AnalysisAiInput } from "@/lib/client-profiles/ai-input";
import type {
  AnalysisDayContext,
  ClientProfileSections,
} from "@/lib/client-profiles/types";
import {
  buildAnalysisAiInput,
  logAnalysisAiInputInDev,
} from "@/lib/client-profiles/ai-input";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";

type LifestyleData = {
  clientName?: string;
  measurementDate?: string;
  age?: string;
  gender?: string;
  heightCm?: string;
  weightKg?: string;
  medications?: string;
  drinkingHabit?: string;
  exerciseHabit?: string;
  snoringNasal?: string;
  medicalHistory?: string;
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
  /** 固定プロフィール（client_profiles）。当日情報と混在させない */
  fixedProfile?: ClientProfileSections;
  /** 当日情報（将来用） */
  dayContext?: AnalysisDayContext;
  /** 事前構築済み AI 入力 JSON（あれば優先利用） */
  aiInput?: AnalysisAiInput;
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "goodPoints",
    "improvements",
    "summary",
    "karteSummary",
    "profileRelation",
    "scoreComment",
    "todaysRecommendations",
    "nextComparisonPoints",
    "recommendationsUntilNext",
    "score",
    "scoreBreakdown",
    "categoryScores",
    "metrics",
    "caution",
    "disclaimer",
  ],
  properties: {
    goodPoints: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    improvements: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["stars", "text"],
        properties: {
          stars: { type: "integer", enum: [5, 4, 3] },
          text: { type: "string" },
        },
      },
    },
    summary: { type: "string" },
    /** Sleep Wellness Institute Japan 独自 AIカルテ（変化の記録・100〜200文字） */
    karteSummary: { type: "string" },
    profileRelation: { type: "string" },
    scoreComment: { type: "string" },
    todaysRecommendations: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    nextComparisonPoints: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    recommendationsUntilNext: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
    },
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
    categoryScores: {
      type: "object",
      additionalProperties: false,
      required: ["body", "mind", "lifestyle", "environment"],
      properties: {
        body: { type: "number" },
        mind: { type: "number" },
        lifestyle: { type: "number" },
        environment: { type: "number" },
      },
    },
    metrics: metricsJsonSchema,
    caution: { type: "string" },
    disclaimer: { type: "string" },
  },
} as const;

const SYSTEM_INSTRUCTIONS = `あなたは Sleep Wellness Institute Japan（SWIJ）の
睡眠ウェルネス専門家レポート作成エンジンです。
目的は数値の羅列ではなく、一般の方にもわかりやすい「専門家レポート」を作ることです。
次の4ソースを統合して分析してください（優先順位順）:
① SOXAI 確認済み実測データ
② 当日の生活習慣（フォーム / day_context）
③ 固定プロフィール（普段の傾向）
④ 前回分析（あれば差分を可能性として参照。無ければ触れない）

AI、ChatGPT、モデル名、テンプレート文章などの内部事情は文章に書かないでください。
一般論のテンプレート回答は禁止。今回のデータと入力にのみ紐づけて書いてください。

==============================
文章ルール（厳守）
==============================
- 読みやすい短段落で書く。長文の塊にしない
- 1文は短く。専門用語は避け、使う場合はすぐわかりやすい言葉で言い換える
  （例: HRV → 心拍のゆらぎ、SpO₂ → 血中の酸素、REM → 浅い眠りの一種 など）
- 同じ内容の繰り返しを避ける。重要文のみ **太字**
- 「まずは」「今回のデータでは」「可能性があります」「次回までの観察が大切です」を自然に使う
- 過剰に褒めず、問題を過度に深刻化しない。命令口調・責め口調は禁止
- 段落は1〜3文程度。箇条書きは1項目1文・短く

==============================
分析の考え方（内部）
==============================
出力前に次を頭の中で整理する（出力には出さない）:
1. 確認済みメトリクスを読む
2. 【必須・最優先】今回の睡眠で良かった点を先に特定する（最低2つ）
3. その後に改善余地を分ける
4. 固定プロフィール（普段の傾向）と当日習慣を区別して関連づける
5. スコアと4軸のバランスを決める
6. 今日できること3つと、次回見るべきポイント、次回までの行動目標を決める
7. Sleep Wellness Institute Japan 独自 AIカルテ用の「クライアントの変化」要約を書く
根拠のない改善提案・おすすめは禁止。未入力・未測定は推測しない。
改善点を先に考えたり、良かった点を後回しにしたりしない。

==============================
絶対禁止事項（厳守）
==============================

⓪ 改善点だけのレポートは絶対禁止（最重要）
- 必ず最初に「良かった点」を書く。改善点から始めてはならない
- goodPoints を空にする・省略する・1件未満にすることは禁止
- summary を改善点・注意点・整え余地だけで始めることは禁止
- 指摘・改善・おすすめだけが目立つレポートは禁止
- たとえ改善余地が多くても、データ上前向きに伝えられる事実を先に書く

① 単日データだけで断定しない
- 「ストレスがかかっている」「回復できている」などの断定は禁止
- 必ず「今回のデータでは〜の可能性があります」など穏やかに書く
- caution で、数日〜2週間の推移を見るよう必ず促す

② 測定できていない項目・基準値が不明な項目を推測しない
- 空・未確認の項目の状態を埋めない
- 個人の基準値が無い指標は、絶対値だけで良し悪しを断定しない

③ 心拍のゆらぎ・血中酸素の単独断定禁止
- 他指標・生活習慣と関連づけて「可能性」として述べる

④ 不足項目の明示
- 値が空・未確認の項目は、必要なら「今回の画像では確認できませんでした」と明記する

⑤ 医療診断・治療表現は禁止
- 病名・異常・疾患の断定、治療指示は使わない
- 睡眠ウェルネス支援・専門家レポートとして書く

⑥ 「可能性があります」を使う
- 要因や影響は断定せず、可能性として述べる

⑦ 「睡眠時間を増やしてください」だけで終わらない
- 入眠前の切り替え・光・呼吸・入浴・飲酒終了・夕食時間など現実的な策を書く

⑧ ソースの混同禁止
- 固定プロフィール＝普段の傾向。当日の飲酒・カフェイン・運動と混同しない
- 前回分析の数値を今回の数値として書かない

==============================
年齢・性別の扱い（必須ルール）
==============================
- 年齢・性別が入力されている場合:
  評価・考察・改善提案で年齢・性別を考慮する
  一般的な睡眠指標の目安との比較は「参考値」と明記する
  医療診断・病名の断定には使わない
- 年齢または性別が未入力の場合:
  summary・scoreComment・caution のいずれかで必ず
  「年齢・性別を考慮していない参考分析」と明記する
  年齢・性別を推測して埋めない

==============================
クライアント基本情報の扱い
==============================
- 身長・体重、服薬、飲酒習慣、運動習慣、いびき・鼻づまり、既往歴が入力されていれば、
  睡眠データとの関連を可能性として触れてよい
- 未入力の項目は触れない。既往歴や服薬から病名を断定しない
- 「当日の飲酒・運動」と「飲酒習慣・運動習慣」は区別して扱う

==============================
確認済みメトリクスの扱い
==============================
ユーザーが確認・確定したメトリクスが渡された場合、それを分析の唯一の数値根拠とする。
画像の再読取で上書きしない。空文字の項目は「今回の画像では確認できませんでした」扱い。
出力 JSON の metrics には、確認済みメトリクスをそのまま入れる。

【ストレス】
- 測定ストレスは metrics.stress
- 「主観的ストレス・気分」は本人申告。metrics.stress に混ぜず、文章で分けて扱う
- metrics.stress が空なら、心拍のゆらぎなどからストレス状態を推測して埋めない

==============================
レポート構成（この順で生成。空欄禁止）
==============================

【構成の鉄則】必ず「良かった点 → 改善点 → 総合評価」の順。改善点だけは禁止。

① goodPoints（今回の睡眠で良かった点）※必須・最優先・省略禁止
  必ず 2〜4件の配列（1件以下・空は禁止）。各項目は1文・短文のみ（目安 40文字以内）。
  レポートの最初に書く内容。今回のデータで前向きに伝えられる事実・傾向だけを書く。
  例:
  - 「深い睡眠時間は十分確保できています」
  - 「運動量も多く、回復力は高い状態です」
  無理に褒めない。根拠のない美辞麗句は禁止。
  改善点・注意点・「〜が課題」のような文言をここへ入れない。
  番号は付けない（表示側で付ける）。

② improvements（改善が期待できるポイント）
  ※必ず goodPoints のあとに書く。改善点からレポートを始めない。
  最も効果が高い順に 1〜5件（上限5件。全部を一度に改善しろとは言わない）。
  各項目は { stars, text } オブジェクト。
  stars は次のいずれかのみ（重要度）:
    5 = ★★★★★ 今すぐ改善（最も効果が高い／緊急性が高い）
    4 = ★★★★☆ 今週改善
    3 = ★★★☆☆ 余裕があれば
  配列は stars の高い順（5→4→3）。同じ stars でも効果が高いものを先に。
  text に★・優先番号・「今すぐ改善」などのラベルは付けない（表示側で付ける）。
  本人を責めず、「整える余地」「改善が期待できる」表現。
  今回の数値・当日習慣・プロフィールに紐づく内容のみ。
  各 text は1文〜2文まで。長文禁止。

③ summary（総合評価）
  必ず 100〜200文字（日本語）。
  【最重要】必ず最初の文・最初の段落で「今回の睡眠で良かった点」から書き始める。
  書き出しの例（このトーンで、今回データに合わせて言い換える）:
  「今回の睡眠では、深い睡眠時間は十分確保できています。
  運動量も多く、回復力は高い状態です。」
  良かった点を述べたあとに、全体の見通しや整え余地を短く続けてよい。
  改善点・注意点・課題だけで始まる文章は禁止。
  数値の羅列はしない。1〜2段落。単日評価であることを踏まえて穏やかに表現する。

③-b karteSummary（AIカルテ・クライアントの変化）※必須
  Sleep Wellness Institute Japan 独自カルテに保存する「変化の記録」。
  必ず 100〜200文字（日本語）。summary（今回の総合評価）とは役割が異なる。
  前回分析がある場合:
    改善した点 → 悪化・注意点 → 今後優先すべき整えポイント、の順で簡潔にまとめる。
    例: 「前回より睡眠効率が改善しました。一方で飲酒量は増加しています。今後は室温調整を優先すると改善が期待されます。」
    前回の karteSummary / nextComparisonPoints / recommendationsUntilNext も参照してよい。
  前回分析がない場合（初回）:
    「初回カルテ」として今回の主な特徴と今後の優先ポイントを記録する。
    「前回より」など比較表現は使わない。
    例: 「初回分析では深い睡眠は確保できています。一方で就寝前の飲酒が目立ちます。今後は飲酒終了時刻の前倒しを優先すると改善が期待されます。」
  数値の羅列禁止。医療診断表現禁止。単日断定禁止。「可能性があります」トーンを保つ。

④ profileRelation（プロフィールとの関連）
  2〜4短段落（全体でおおむね 120〜220文字）。
  固定プロフィール（普段の傾向）と今回の睡眠データのつながりをわかりやすく書く。
  プロフィール未入力の場合は「今回はプロフィール情報が少ないため、測定データ中心の参考見解です」と短く述べる。
  当日の一時的な習慣と普段の傾向を混同しない。

⑤ scoreComment（睡眠ウェルネススコアの解説）
  2〜3短段落（全体でおおむね 80〜160文字）。
  score（0〜100）と身体/心/生活/環境のバランスを、一般の方向けにやさしく説明する。
  SOXAI睡眠スコアとの違いには触れなくてよい（UI側で表示）。
  数値の羅列は避け、「どの軸が支えになっているか／どこに整え余地があるか」を伝える。

⑥ todaysRecommendations（今日のおすすめ）※必須・厳守
  必ずちょうど 3件の配列。2件以下・4件以上は禁止。
  優先順位が高い順（1件目が最優先）。
  ユーザーが「今日」実践できる具体アクションのみ。長期計画・抽象論・一般論は禁止。
  各項目は1文・短文のみ（目安 40文字以内）。長文禁止。説明・理由・補足を足さない。
  番号（①②③）は付けない（表示側で付ける）。文末は「ましょう」などやさしい提案形でよい。
  例:
  - 「今日は飲酒を350mL減らしましょう」
  - 「運動後は必ず着替えましょう」
  - 「寝室温度を25℃にしましょう」
  improvements と整合させる。根拠に無い提案は禁止。
  今回の入力に無い習慣を無理に入れない。

⑦ nextComparisonPoints（次回比較ポイント）
  2〜4件の配列。各項目は1文・短文（目安 40文字以内）。
  次回の分析で「前回と比べて見るべき観点」を書く。
  例: 「深い睡眠の割合の変化」「就寝前の飲酒終了時刻」「心拍のゆらぎの推移」
  行動指示ではなく、観察・比較の観点にする。番号は付けない。

⑧ recommendationsUntilNext（次回までのおすすめ＝行動目標）※必須
  必ず 3〜5件の配列。2件以下・6件以上は禁止。
  次回分析までに継続して取り組む行動目標のみ。
  todaysRecommendations（今日だけ）や nextComparisonPoints（観察観点）と役割を混ぜない。
  各項目は1文・短文のみ（目安 40文字以内）。長文・抽象論・一般論は禁止。
  番号は付けない。文末は「〜する」「〜を続ける」など実践できる目標形でよい。
  例:
  - 「就寝90分前までに入浴を終える」
  - 「平日の起床時刻を揃える」
  - 「午後のカフェインを控える」
  improvements / todaysRecommendations と整合させる。根拠に無い提案は禁止。
  前回分析に recommendationsUntilNext がある場合は、達成・未達の可能性を踏まえつつ、今回のデータに合う目標を新たに書く（前回の文言をそのままコピーしない）。

- caution: 単日の限界を簡潔に。強い症状・呼吸苦などが疑われる場合のみ医療機関相談を穏やかに促す
- disclaimer: 睡眠ウェルネス支援であり医療診断・治療を代替しない旨を簡潔に
- scoreBreakdown: 各1〜5。未確認項目は控えめ。score と矛盾しないこと
- score: Sleep Wellness Platform 独自の「睡眠ウェルネススコア」0〜100。
  SOXAI睡眠スコアのコピー禁止。以下を総合して評価する:
  ・プロフィール（固定） ・生活習慣（当日＋習慣） ・運動 ・ストレス（測定＋主観） ・睡眠環境 ・SOXAI実測
  SOXAIスコアとは別物の独自指標である
- categoryScores: 睡眠ウェルネススコアを4カテゴリーに分解した各0〜100点。レーダーチャート用。
  ・body（身体）: 睡眠時間・効率・深い睡眠・浅い眠りの一種（REM）・血中酸素・安静時心拍・回復・運動・健康（鼻づまり等）
  ・mind（心）: 心拍のゆらぎ・測定ストレス・主観ストレス・休息への切り替え・睡眠の満足感
  ・lifestyle（生活）: 飲酒・喫煙・カフェイン・食事・勤務リズム・運動タイミング・就寝起床の規則性
  ・environment（環境）: 寝室温度湿度・寝具・光・騒音・職場高温・環境イベントなど
  未入力・未測定の軸は過度に高くせず、総合 score と大きく矛盾しないこと
  4軸の平均がおおむね score ±8 点程度に収まるよう整合させる

==============================
生活習慣との連動ガイド
==============================
- 飲酒あり／終了が遅い → 終了時刻の前倒しや量の調整の可能性
- 食事（遅い夕食・欠食） → 入眠との間隔の可能性（欠食だけで断定しない）
- 運動／ヨガ／ピラティス → 実施時刻と回復の関係（効果は断定しない）
- 仕事の負荷・長時間・不規則 → 入眠前の切り替え不足の可能性
- カフェイン（午後以降） → 入眠のしやすさ・浅い睡眠への影響の可能性
- 鼻づまり → 呼吸・途中覚醒への影響の可能性
- 当てはまらない習慣・未入力は無理に触れない

==============================
出力
==============================
- 出力は指定の JSON スキーマのみ`;

function validateBody(body: unknown): {
  ok: true;
  lifestyle: LifestyleData;
  images: string[];
  metrics?: AnalysisMetrics;
  fixedProfile?: ClientProfileSections;
  dayContext?: AnalysisDayContext;
  aiInput?: AnalysisAiInput;
} | {
  ok: false;
  message: string;
} {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "リクエスト形式が正しくありません。" };
  }

  const { lifestyle, images, metrics, fixedProfile, dayContext, aiInput } =
    body as AnalyzeRequestBody;

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

  return {
    ok: true,
    lifestyle,
    images,
    metrics: confirmed,
    fixedProfile:
      fixedProfile && typeof fixedProfile === "object"
        ? fixedProfile
        : undefined,
    dayContext:
      dayContext && typeof dayContext === "object" ? dayContext : undefined,
    aiInput: aiInput && typeof aiInput === "object" ? aiInput : undefined,
  };
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

function formatGender(value: string | undefined): string | undefined {
  if (!value?.trim()) return value;
  const labels: Record<string, string> = {
    female: "女性",
    male: "男性",
    other: "その他",
    unspecified: "回答しない",
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

  const ageGenderNote =
    lifestyle.age?.trim() && lifestyle.gender?.trim()
      ? "年齢・性別あり（評価に考慮。一般基準との比較は参考値）"
      : "年齢または性別が未入力 → 年齢・性別を考慮していない参考分析として明記すること";

  const rows: Array<[string, string | undefined]> = [
    ["対象者名", lifestyle.clientName],
    ["測定日", lifestyle.measurementDate],
    ["年齢", lifestyle.age],
    ["性別", formatGender(lifestyle.gender)],
    ["年齢・性別の分析方針", ageGenderNote],
    ["身長（cm）", lifestyle.heightCm],
    ["体重（kg）", lifestyle.weightKg],
    ["服薬", lifestyle.medications],
    ["飲酒習慣（日常）", lifestyle.drinkingHabit],
    ["運動習慣（日常）", lifestyle.exerciseHabit],
    ["いびき・鼻づまり（基本情報）", lifestyle.snoringNasal],
    ["既往歴", lifestyle.medicalHistory],
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
    ["飲酒したか（当日）", alcoholDrankLabel || lifestyle.alcohol],
    ["飲酒の種類", lifestyle.alcoholType],
    ["飲酒量", lifestyle.alcoholAmount],
    ["飲酒終了時刻", lifestyle.alcoholEndTime],
    ["飲酒の補足（複数種類など）", lifestyle.alcoholNotes],
    ["飲酒まとめ（当日）", lifestyle.alcohol],
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
    ["鼻づまり（当日）", lifestyle.nasalCongestion],
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

  const aiInput = buildAnalysisAiInput({
    analysisDate:
      validated.aiInput?.analysisDate ?? lifestyle.measurementDate,
    clientId: validated.aiInput?.clientId,
    clientName:
      validated.aiInput?.clientName ?? lifestyle.clientName,
    soxaiMetrics: confirmedMetrics ?? null,
    dayContext: validated.aiInput?.dayContext
      ? (validated.aiInput.dayContext as AnalysisDayContext)
      : validated.dayContext ?? null,
    lifestyleForm: lifestyle,
    fixedProfile: validated.fixedProfile ?? null,
    previousAnalysis: validated.aiInput?.previousAnalysis ?? null,
  });

  // クライアント側で付けた要約・構造化プロフィールがあれば優先
  if (validated.aiInput?.fixedProfileSummary) {
    aiInput.fixedProfileSummary = validated.aiInput.fixedProfileSummary;
  }
  if (validated.aiInput?.fixedProfile) {
    aiInput.fixedProfile = validated.aiInput.fixedProfile;
  }
  if (validated.aiInput?.previousAnalysis) {
    aiInput.previousAnalysis = validated.aiInput.previousAnalysis;
  }

  logAnalysisAiInputInDev(aiInput);

  const fixedProfileBlock = aiInput.fixedProfileSummary
    ? `【③ 固定プロフィール（普段の傾向・分析参照用。診断ではない。当日データより優先度は低い。未記載は触れない・推測禁止）】
構成: 生活スタイル / 睡眠へ影響しそうな要素 / AIが分析時に重視する項目
${aiInput.fixedProfileSummary}

【固定プロフィール構造化データ（未入力除外済み）】
${JSON.stringify(aiInput.fixedProfile ?? {}, null, 2)}`
    : `【③ 固定プロフィール】
未取得または未入力のため、固定プロフィールに基づく言及は行わない。`;

  const dayContextBlock = aiInput.dayContext
    ? `【② 当日の生活習慣（day_context。固定プロフィールの「普段」と混同しない）】
${JSON.stringify(aiInput.dayContext, null, 2)}`
    : `【② 当日の生活習慣（構造化）】
構造化 day_context は未取得。下記のフォーム入力を当日情報として使う。`;

  const previousBlock = aiInput.previousAnalysis
    ? `【④ 前回分析（比較用。差分は可能性としてのみ。今回の数値に上書きしない）】
${JSON.stringify(aiInput.previousAnalysis, null, 2)}`
    : `【④ 前回分析】
前回分析なし。前回比較には触れない。`;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 280_000,
      maxRetries: 1,
    });

    const metricsBlock = confirmedMetrics
      ? `【① SOXAI 確認済みメトリクス（分析の唯一の数値根拠。上書き・推測禁止）】
${formatConfirmedMetrics(confirmedMetrics)}

出力 metrics には上記をそのまま反映すること。
「今回の画像では確認できませんでした」の項目は推測で埋めず、文章でも同じ文言で明示する。`
      : `【① 画像解析 — 最大限抽出】
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
              text: `以下の4ソースを統合し、Sleep Wellness Institute Japan の
睡眠ウェルネス専門家レポートを作成してください。

必須の思考順: 数値を読む → 【最優先】良かった点を先に特定（最低2つ） → その後に改善余地 → プロフィールとの関連 → スコア解説 → 今日のおすすめ → 次回比較ポイント → 次回までの行動目標。
改善点だけのレポートは絶対禁止。必ず最初に良かった点を書く。
根拠のない改善提案・おすすめは禁止。テンプレート文章は禁止。単日データで断定しない。
文章は短段落・わかりやすい言葉で。専門用語は避けるか言い換える。

優先順位: SOXAI実測 > 当日生活習慣 > 固定プロフィール > 前回分析 > 気象 > 一般参考基準。
固定プロフィールに無い項目は推測しない。前回が無い場合は前回比較に触れない。
前回の recommendationsUntilNext（行動目標）がある場合は、checked（達成）/未達成を可能性として参照し、今回の目標に活かす。数値として上書きしない。

${metricsBlock}

${dayContextBlock}

${fixedProfileBlock}

${previousBlock}

【必ずこの順で空欄なく生成】
① goodPoints＝今回の睡眠で良かった点（必ず2〜4件の短文。省略・空・1件以下は禁止。レポートの最初）
  例: 「深い睡眠時間は十分確保できています」「運動量も多く、回復力は高い状態です」
② improvements＝改善が期待できるポイント（重要度順・最大5件。{stars:5|4|3, text}。全部改善しろとは言わない。goodPoints の後に書く）
  stars: 5=今すぐ改善 / 4=今週改善 / 3=余裕があれば。効果が高い順。text に★やラベルは付けない。
③ summary＝総合評価（100〜200文字）。必ず最初に良かった点から書き始める。改善点だけで始めない。
  例のトーン: 「今回の睡眠では、深い睡眠時間は十分確保できています。運動量も多く、回復力は高い状態です。」のあと、整え余地を短く続ける。
③-b karteSummary＝AIカルテ・クライアントの変化（100〜200文字）。SWIJ独自カルテ用。
  前回あり: 改善→悪化・注意→今後の優先、の順。例「前回より睡眠効率が改善しました。一方で飲酒量は増加しています。今後は室温調整を優先すると改善が期待されます。」
  初回: 「前回より」比較は禁止。特徴＋今後の優先を記録。
  summary の言い換え禁止。変化記録として書く。
④ profileRelation＝プロフィールとの関連（短段落）
⑤ scoreComment＝睡眠ウェルネススコアの解説（短段落）＋ score / categoryScores / scoreBreakdown
⑥ todaysRecommendations＝今日のおすすめ（必ずちょうど3件。今日実践できる短文のみ）
⑦ nextComparisonPoints＝次回比較ポイント（2〜4件。次回見るべき観点の短文）
⑧ recommendationsUntilNext＝次回までのおすすめ（行動目標・必ず3〜5件。継続して取り組む短文）

【絶対禁止】
- 改善点だけのレポート（良かった点を書かない／後回しにする／summary を改善点だけで始める）
- goodPoints が空・1件以下・改善点の言い換えになっていること
- karteSummary が空・100文字未満・200文字超であること
- 前回があるのに karteSummary で変化に触れないこと／初回なのに「前回より」と書くこと
- todaysRecommendations が 3件以外であること（必ずちょうど3件）
- todaysRecommendations に長文・抽象論・今日できない内容を書くこと
- recommendationsUntilNext が 3〜5件以外であること
- recommendationsUntilNext に今日だけの内容・観察観点だけの文言を書くこと
- 専門用語だらけの長文レポートにすること
- 心拍のゆらぎ・血中酸素だけで状態を断定しない
- 未測定・基準不明の項目を推測で埋めない
- 医療診断・治療表現を使わない
- 単日だけで結論しない。「可能性があります」を使う
- 年齢・性別の一般基準比較は参考値のみ。病名断定禁止
- 年齢または性別が未入力なら「年齢・性別を考慮していない参考分析」と明記

【クライアント基本情報＋生活習慣フォーム（当日入力を含む。固定プロフィールと区別）】
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
