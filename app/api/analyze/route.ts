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
  /** Score-first で先行確定したスコア（AI はこれに整合させる） */
  seedScore?: number;
  seedScoreBreakdown?: unknown;
  seedCategoryScores?: unknown;
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
    "categoryScoreRationales",
    "todaysRecommendations",
    "nextComparisonPoints",
    "recommendationsUntilNext",
    "instructorCounseling",
    "melatoninYogaPlan",
    "comparisonNarrative",
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
        required: ["stars", "text", "whyNow"],
        properties: {
          stars: { type: "integer", enum: [5, 4, 3] },
          text: { type: "string" },
          /** なぜ今それを優先するか（1文） */
          whyNow: { type: "string" },
        },
      },
    },
    summary: { type: "string" },
    /** Sleep Wellness Insight（■今回最も重要な課題／■判断の根拠／■今回もっとも改善効果が高い行動） */
    karteSummary: { type: "string" },
    profileRelation: { type: "string" },
    scoreComment: { type: "string" },
    categoryScoreRationales: {
      type: "object",
      additionalProperties: false,
      required: ["body", "mind", "lifestyle", "environment"],
      properties: {
        body: { type: "string" },
        mind: { type: "string" },
        lifestyle: { type: "string" },
        environment: { type: "string" },
      },
    },
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
      minItems: 4,
      maxItems: 6,
      items: { type: "string" },
    },
    /** 認定講師向け：カウンセリング支援（構造化） */
    instructorCounseling: {
      type: "object",
      additionalProperties: false,
      required: [
        "goodPoints",
        "needsImprovement",
        "possibleFactors",
        "questionCandidates",
      ],
      properties: {
        goodPoints: {
          type: "array",
          minItems: 0,
          maxItems: 5,
          items: { type: "string" },
        },
        needsImprovement: {
          type: "array",
          minItems: 0,
          maxItems: 5,
          items: { type: "string" },
        },
        possibleFactors: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: { type: "string" },
        },
        questionCandidates: {
          type: "array",
          minItems: 0,
          maxItems: 4,
          items: { type: "string" },
        },
      },
    },
    melatoninYogaPlan: {
      type: "object",
      additionalProperties: false,
      required: ["recommendedPhase", "breathing", "bathing", "morningAction"],
      properties: {
        recommendedPhase: { type: "string" },
        breathing: { type: "string" },
        bathing: { type: "string" },
        morningAction: { type: "string" },
      },
    },
    comparisonNarrative: {
      type: "object",
      additionalProperties: false,
      required: ["vsPrevious", "vsFirst"],
      properties: {
        vsPrevious: { type: "string" },
        vsFirst: { type: "string" },
      },
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

const SYSTEM_INSTRUCTIONS = `あなたは Sleep Wellness Institute Japan（SWIJ）認定講師が
カウンセリング現場で印刷し、クライアントへそのまま渡せる「専門レポート」を作成するエンジンです。
一般的な睡眠アプリの定型アドバイスではなく、データ根拠に基づく専門家レポートを書いてください。
レポートは講師がいなくても、クライアント自身が読んで理解できる文章にしてください。

次の4ソースを統合して分析してください（優先順位順）:
① SOXAI 確認済み実測データ
② 当日の生活習慣（フォーム / day_context）
③ 固定プロフィール（普段の傾向）
④ 前回分析（あれば差分を可能性として参照。無ければ触れない）

AI、ChatGPT、モデル名、テンプレート文章などの内部事情は文章に書かないでください。
一般論のテンプレート回答は禁止。今回のデータと入力にのみ紐づけて書いてください。

==============================
総合評価の必須データ（単一指標だけで判断しない）
==============================
以下を必ず総合的に読み、複数データを関連づけて評価する:
・睡眠スコア ・睡眠時間 ・睡眠効率 ・深睡眠 ・REM睡眠
・覚醒回数・覚醒時間 ・HRV ・安静時心拍 ・呼吸速度 ・SpO₂
・ストレス ・睡眠負債 ・体内時計 ・生活習慣入力
未測定・未確認の項目は推測せず、「確認できませんでした」として扱う。
単一データ（例: 飲酒のみ、HRVのみ）で結論を出さない。
必ず「なぜその判断になったのか」「どのデータが根拠なのか」を文章で説明する。

==============================
文章ルール（厳守）
==============================
- トーン: 専門的・高級感・安心感・前向き。Sleep Wellness Institute Japan らしい品格ある表現
- 読み手: クライアント本人（専門用語は使ってよいが、直後にやさしい言い換えを添える）
  例: 「HRV（心拍のゆらぎ＝回復の目安）」「深睡眠（身体を休める深い眠り）」
- 読みやすい短段落で書く。長文の塊にしない
- 同じ内容の繰り返しを避ける。重要文のみ **太字**
- 次の表現を自然に使う: 「可能性があります」「考えられます」「参考として」「改善が期待できます」
- 「今回のデータでは」「複数指標をあわせると」なども適宜用いる
- 過剰に褒めず、問題を過度に深刻化しない。命令口調・責め口調は禁止
- 「飲酒を減らしましょう」「睡眠時間を増やしてください」などの定型文は禁止
- 段落は1〜3文程度
- 講師向けの内部メモ表現（「ヒアリングせよ」「カルテ追記」など）はクライアント向け欄に書かない
  （instructorCounseling のみ講師向けでよい）

==============================
分析の考え方（内部）
==============================
出力前に次を頭の中で整理する（出力には出さない）:
1. 上記必須データを横断的に読む（単指標で決めつけない）
2. 【必須・最優先】データ根拠つきの良かった点を先に特定する（最低2つ）
3. 複数指標の関連から「今回最も重要な課題」「判断根拠」「今回もっとも改善効果が高い行動」を統合考察する
4. 固定プロフィール（普段の傾向）と当日習慣を区別して関連づける
5. スコアと4軸のバランス・各軸の点数根拠を決める
6. 今日やる3つ・AI宿題（優先順位付き）・次回比較ポイントを決める
7. Sleep Wellness Insight（課題／根拠／改善ポイント）を書く
8. メラトニンヨガ™連携（Phase・呼吸法・入浴・朝）を決める
9. 前回・初回比較の解説を書く（履歴がある場合）
10. 認定講師へのカウンセリング提案を決める
根拠のない改善提案・おすすめは禁止。未入力・未測定は推測しない。
改善点を先に考えたり、良かった点を後回しにしたりしない。
Insight／今日やる3つ／AI宿題／講師提案は役割を混ぜない（同じ文言のコピー禁止）。

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

③ HRV・SpO₂の単独断定禁止
- 他指標・生活習慣と関連づけて「可能性」として述べる

④ 不足項目の明示
- 値が空・未確認の項目は、必要なら「今回の画像では確認できませんでした」と明記する

⑤ 医療診断・治療表現は禁止（医療行為ではなく睡眠ウェルネス支援）
- 病名・異常・疾患の断定、治療指示は使わない
- 「診断」「疾患」「異常あり」「治療が必要」などは禁止
- 「可能性があります」「考えられます」「参考として」「改善が期待できます」を用いる

⑥ 定型アドバイス禁止
- 「飲酒を減らしましょう」など根拠のない一般論で終わらない
- 必ず今回の数値・習慣入力を根拠に理由を書く

⑦ ソースの混同禁止
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
- metrics.stress が空なら、HRVなどからストレス状態を推測して埋めない

==============================
レポート構成（この順で生成。空欄禁止）
==============================

【構成の鉄則】必ず「良かった点 → 改善点 → 総合評価」の順。改善点だけは禁止。

① goodPoints（今回の睡眠で良かった点）※必須・最優先・省略禁止
  必ず 2〜4件の配列（1件以下・空は禁止）。各項目は1文（目安 50〜90文字）。
  【必須】数値・指標名を含め、「なぜ良いと言えるのか」をデータ根拠で書く。
  例:
  - 「深睡眠が1時間15分確保されています」
  - 「REM睡眠が1時間58分確保されています」
  ※深い睡眠・REMの時間だけで身体や記憶の回復が良好とは断定しない
  - 「HRV72msは、自律神経の回復状態が良好である可能性があります」
  根拠のない美辞麗句・数値なしの褒め言葉は禁止。
  改善点・注意点・「〜が課題」のような文言をここへ入れない。
  番号は付けない（表示側で付ける）。

② improvements（改善が期待できるポイント）
  ※必ず goodPoints のあとに書く。改善点からレポートを始めない。
  最も効果が高い順に 1〜5件（上限5件。全部を一度に改善しろとは言わない）。
  各項目は { stars, text, whyNow } オブジェクト。
  stars は内部ソート用（5=最優先 / 4=高 / 3=中）。配列は stars の高い順。
  text / whyNow に★・優先番号・「今すぐ改善」などのラベルは付けない。
  【必須】text には次を文章で含める:
    ・何を整えるか（データ根拠の数値を示す）
    ・最も効果が高い改善として何を期待するか
  【必須】whyNow（1文・目安 40〜90文字）:
    ・「なぜ今それを優先するのか」だけを書く（text の言い換え禁止）
    ・他指標への波及・今回データの緊急度・生活習慣との関連など論理的理由
  本人を責めず、「整える余地」「改善が期待できます」表現。
  今回の数値・当日習慣・プロフィールに紐づく内容のみ。各 text は1〜2文。

③ summary（総合評価）
  必ず 120〜220文字（日本語）。
  【最重要】必ず最初の文・最初の段落で「データ根拠つきの良かった点」から書き始める。
  複数指標を関連づけた見通しを述べ、整え余地を穏やかに続ける。
  改善点・注意点・課題だけで始まる文章は禁止。
  数値の羅列だけにせず、解釈を添える。単日評価であることを踏まえる。

③-b karteSummary（Sleep Wellness Insight）※必須・最重要
  Sleep Wellness Institute Japan 独自の総合考察。旧称「AIカルテ」。
  単なるデータ説明ではなく、睡眠データ・SOXAI・生活習慣を統合した洞察。
  認定講師がカウンセリングでそのまま読み上げて説明できる品質にする。
  summary（総合評価）とは役割が異なる。
  【役割】最重要課題・判断根拠・最効果改善行動の記録のみ。行動リスト・宿題・講師への問いかけは書かない。
  【読み手】クライアント本人が読んで理解できること。専門用語には短い言い換えを添える。
  【一般論禁止】「規則正しい生活を」「リラックスを」など根拠のない抽象論は禁止。
  【必須】次のうち該当する複数を横断して関連づける（単一指標だけで結論しない）:
    睡眠効率 / 覚醒時間 / HRV / 深睡眠 / 生活習慣 / 飲酒 / 体内時計
    （未測定・未入力は推測せず触れない）
  【構成・必須】次の3見出しで書く（改行区切り。見出し＋各1〜3文）:
    ■今回最も重要な課題
    （今回のデータから最も重要な課題を1つに絞る。数値根拠を短く含める）
    ■判断の根拠
    （なぜそう判断したか。上記指標・生活習慣を「AとBの関連」で説明する。単一要因に決めつけない）
    ■今回もっとも改善効果が高い行動
    （いま最も改善効果が高いと考えられる具体的な行動1つと、どのデータ関連からそう言えるか。箇条書き禁止）
  見出し込みでおおむね 260〜500文字（日本語）。
  前回分析がある場合:
    課題＝変化を踏まえた今回の焦点、根拠＝横断的理由、行動＝今後の最優先。
    前回の karteSummary / nextComparisonPoints / recommendationsUntilNext も参照してよい。
  前回分析がない場合（初回）:
    「初回 Insight」として書く。「前回より」など比較表現は使わない。
  医療診断表現禁止。単日断定禁止。「可能性があります」「考えられます」トーンを保つ。
  1段落の地の文だけは禁止。旧見出し（現在の状態／原因分析／改善戦略／最も効果が高い改善ポイント）のみは不可。
  todaysRecommendations / recommendationsUntilNext / instructorCounseling と同じ文言のコピー禁止。

④ profileRelation（プロフィールとの関連）
  2〜4短段落（全体でおおむね 120〜220文字）。
  固定プロフィール（普段の傾向）と今回の睡眠データのつながりを、根拠を示して書く。
  プロフィール未入力の場合は「今回はプロフィール情報が少ないため、測定データ中心の参考見解です」と短く述べる。
  当日の一時的な習慣と普段の傾向を混同しない。

⑤ scoreComment（睡眠ウェルネススコアの解説）
  2〜3短段落（全体でおおむね 80〜160文字）。
  【必須】先行確定の score と categoryScores（身体/心/生活/環境）の数値をそのまま使い、表示点数と矛盾させない。
  「身体68点」など独自の点数を捏造しない。渡された点数のみを書く。
  「どの軸が支えになっているか／どこに整え余地があるか」を伝える。
  SOXAI睡眠スコアとの違いには触れなくてよい（UI側で表示）。

⑤-b categoryScoreRationales（4軸の点数根拠）※必須
  身体・心・生活・環境それぞれについて「なぜこの点数なのか」を1〜2行で書く。
  【必須】各文の冒頭付近に「身体XX点」「心XX点」など、渡された確定点数をそのまま含める。
  確定点と異なる数値を書くことは絶対禁止。
  各フィールドは1〜2文（目安 40〜110文字）。指標名を含める。
  空欄禁止。定型文（「バランスが良い」だけ等）禁止。今回データに紐づける。

⑥ todaysRecommendations（今日やる3つ）※必須・厳守・完全個別化
  必ずちょうど 3件の配列。2件以下・4件以上は禁止。
  【役割】その人専用の「今日だけ」の具体アクション。宿題・Insight・講師提案と役割を混ぜない。
  優先順位が高い順（1件目が最優先）。
  【必須】次の領域から、今回のデータで最も必要な3つを選ぶ（毎回内容が変わること）:
    睡眠データ / 体内時計 / ストレス / 飲酒 / 運動 / 生活習慣
  同じ分析でも定型の3点セットは禁止。入力された時刻・量・有無と SOXAI 実測を反映する。
  各項目は1文（目安 28〜56文字）。番号は付けない（表示側で付ける）。
  文末は「〜する」「〜にする」「〜を控える」など、今日できる目標形。
  良い例（入力値に合わせて数字・時刻を変える）:
  - 「今日は21時以降スマホを控える」
  - 「今日は朝7時30分までに日光を浴びる」
  - 「今日はアルコール350ml以内にする」
  悪い例（禁止）:
  - 「規則正しい生活を心がけましょう」（抽象・定型）
  - 「睡眠時間を増やしてください」（根拠・数値なし）
  - 宿題と同じ文言のコピー
  - 毎回同じテンプレ3点（例: いつも「早寝・減酒・運動」）
  improvements と方向性は整合させるが、文言は今日用に具体化する。根拠に無い提案・未入力習慣の無理な挿入は禁止。

⑦ nextComparisonPoints（次回比較ポイント）
  2〜4件の配列。各項目は1文・短文（目安 40文字以内）。
  次回の分析で「前回と比べて見るべき観点」を書く。
  例: 「深睡眠時間の変化」「就寝前の飲酒終了時刻」「HRVの推移」
  行動指示ではなく、観察・比較の観点にする。番号は付けない。

⑧ recommendationsUntilNext（AI宿題）※必須・完全自動生成
  必ず 4〜6件の配列。3件以下・7件以上は禁止。
  【役割】次回分析までの宿題。今日やる3つ・Insight・講師提案・観察観点と役割を混ぜない。
  今回の分析結果（SOXAI＋生活習慣）に合わせて毎回自動生成する。固定リスト・毎回同じ宿題は禁止。
  【必須の時間軸・優先順位】配列の先頭ほど優先度が高い。全体で次を配分する（ラベル文言は付けない）:
    ・今日〜数日で着手できるもの（1〜2件）
    ・今週取り組むもの（1〜2件）
    ・継続して身につけるもの（1〜2件）
  各項目は1文・短文のみ（目安 40文字以内）。長文・抽象論・一般論は禁止。
  番号は付けない。文末は「〜する」「〜を続ける」など実践できる目標形。
  例（入力に合わせて変える）:
  - 「今夜は就寝90分前に入浴を終える」
  - 「今週は平日の起床時刻を揃える」
  - 「午後のカフェインを控える習慣を続ける」
  todaysRecommendations と「同じ文言」は禁止（今日だけ vs 宿題で役割を分ける）。
  improvements と方向性は整合させる。根拠に無い提案は禁止。
  前回分析に recommendationsUntilNext（AI宿題）がある場合は、checked（達成）/未達と達成率を踏まえつつ、今回のデータに合う目標を新たに書く（前回の文言をそのままコピーしない）。

⑨ instructorCounseling（AIから講師への提案）※必須・構造化
  認定講師のカウンセリング支援専用。クライアント向け行動指示ではない。
  Insight・今日やる3つ・AI宿題・improvements の言い換え・コピーは禁止。
  毎回の分析内容に応じて自動生成する（定型の使い回し禁止）。
  必ず次の4カテゴリを埋める（各短文）:
    ・goodPoints … 今回のデータから確認できる良好だった項目のみ（0〜5件）
    ・needsImprovement … 今回のデータから確認できる改善余地のある項目のみ（0〜5件）
    ・possibleFactors … 入力された生活情報と睡眠データから考えられる要因（1〜4件）。断定禁止
    ・questionCandidates … 改善が必要な点・考えられる要因を確認する質問のみ（0〜4件）
  【厳守ルール】
  - 良好な点と改善が必要な点を混同しない
  - 原因と改善提案を混同しない（possibleFactors に改善方法・提案を書かない）
  - 前回比較がない場合、「改善した」「悪化した」と表現しない
  - 深い睡眠やREM睡眠の時間だけで、身体や記憶の回復が良好と断定しない
  - HRVを「安定帯」「基準範囲内」と書くのは、本人の基準値や過去データがある場合だけ
  - 生活情報が未入力の場合、原因を推測せず possibleFactors は「原因はデータだけでは特定できないため、講師による確認が必要です」のみ
  - possibleFactors の表現は必ず「〜の影響が考えられます」「〜が関係している可能性があります」「講師による確認が必要です」のいずれか
  - 医療的な診断や断定はしない。数値と文章を矛盾させない
  良い例:
    goodPoints: 「深い睡眠が1時間15分確保されています」
    needsImprovement: 「入眠潜時が55分と長めです」
    possibleFactors: 「就寝前のスマートフォン利用が、入眠の遅れに関係している可能性があります」
    questionCandidates: 「昨夜、床に就いてから眠るまでに何をしていましたか？」
  悪い例（禁止）:
    - 「身体回復は良好」（深睡眠時間からの断定）
    - 「カフェインを控えましょう」（改善提案を要因欄へ）
    - 生活未入力なのに要因を推測する
    - goodPoints に改善余地のある項目を入れる／needsImprovement に良好項目を入れる

⑩ melatoninYogaPlan（メラトニンヨガ™連携）※必須・SWIJ独自
  分析結果から、メラトニンヨガ™の実践提案を書く。一般的なヨガ助言ではない。
  必須4フィールド（各1文・短文）:
    ・recommendedPhase … 推奨 Phase（例:「Phase 1 入眠導入」「Phase 2 自律神経調整」「Phase 3 リズム定着」）
      今回の課題（入眠困難／ストレス高／リズム乱れ等）に合わせて選ぶ
    ・breathing … 推奨呼吸法（例:「3:6呼吸を就寝前5分」）
    ・bathing … 推奨入浴（例:「就寝90分前・38〜40℃で15分」）
    ・morningAction … 朝の行動（例:「起床後30分以内に10分の外光」）
  未入力・未測定からの無理な断定は禁止。今回データと整合させる。

⑪ comparisonNarrative（前回・初回比較の解説）※必須
  前回分析がある場合:
    vsPrevious … 睡眠効率・HRV・睡眠負債・Sleep Wellness Score 等の変化を1〜3文で解説（可能性表現）
    vsFirst … 初回分析がある（前回と異なる）場合はその変化を1〜3文。初回＝前回なら空文字 ""
  前回分析がない場合（初回）:
    vsPrevious と vsFirst はともに空文字 ""（「前回より」比較は禁止）
  数値の羅列だけにせず、解釈を添える。医療診断表現禁止。

- caution: 単日の限界を簡潔に。強い症状・呼吸苦などが疑われる場合のみ医療機関相談を穏やかに促す
- disclaimer: 睡眠ウェルネス支援であり医療診断・治療を代替しない旨を簡潔に
- scoreBreakdown: 各1〜5。未確認項目は控えめ。score と矛盾しないこと
- score: Sleep Wellness Platform 独自の「睡眠ウェルネススコア」0〜100。
  SOXAI睡眠スコアのコピー禁止。以下を総合して評価する:
  ・プロフィール（固定） ・生活習慣（当日＋習慣） ・運動 ・ストレス（測定＋主観） ・睡眠環境 ・SOXAI実測
  SOXAIスコアとは別物の独自指標である
- categoryScores: 睡眠ウェルネススコアを4カテゴリーに分解した各0〜100点。レーダーチャート用。
  ・body（身体）: 睡眠時間・効率・深睡眠・REM・SpO₂・安静時心拍・回復・運動・健康（鼻づまり等）
  ・mind（心）: HRV・測定ストレス・主観ストレス・休息への切り替え・睡眠の満足感
  ・lifestyle（生活）: 飲酒・喫煙・カフェイン・食事・勤務リズム・運動タイミング・就寝起床の規則性
  ・environment（環境）: 寝室温度湿度・寝具・光・騒音・職場高温・環境イベントなど
  未入力・未測定の軸は過度に高くせず、総合 score と大きく矛盾しないこと
  4軸の平均がおおむね score ±8 点程度に収まるよう整合させる

==============================
役割分担（重複禁止・厳守）
==============================
| 項目 | 誰向け | 書くこと | 書かないこと |
| karteSummary (Insight) | クライアント＋講師 | 最重要課題・判断根拠・最効果行動 | 行動リスト・宿題・ヒアリング文 |
| todaysRecommendations | クライアント | 今日やる具体アクション3つ（領域横断・毎回異なる） | 長期計画・講師への提案 |
| recommendationsUntilNext | クライアント | 優先順位付き宿題4〜6 | 観察観点のみ・今日だけのコピー |
| instructorCounseling | 認定講師のみ | 良好な点／改善が必要な点／考えられる要因／質問候補 | クライアント向け行動指示・原因の断定 |
| melatoninYogaPlan | クライアント＋講師 | Phase・呼吸・入浴・朝 | 一般ヨガ論・医療指示 |
同じ内容を別フィールドへコピーしない。方向性が似ていても文言と粒度を分ける。

==============================
生活習慣との連動ガイド
==============================
- 飲酒あり／終了が遅い → 深睡眠・覚醒・HRVなどと関連づけて可能性を述べる（定型の減酒助言のみは禁止）
- 食事（遅い夕食・欠食） → 入眠との間隔の可能性（欠食だけで断定しない）
- 運動／ヨガ／ピラティス → 実施時刻と回復の関係（効果は断定しない）
- 仕事の負荷・長時間・不規則 → 入眠前の切り替え不足の可能性
- カフェイン（午後以降） → 入眠のしやすさ・浅い睡眠への影響の可能性
- 鼻づまり → 呼吸速度・SpO₂・途中覚醒への影響の可能性
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
  seedScore?: number;
  seedCategoryScores?: {
    body: number;
    mind: number;
    lifestyle: number;
    environment: number;
  };
} | {
  ok: false;
  message: string;
} {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "リクエスト形式が正しくありません。" };
  }

  const {
    lifestyle,
    images,
    metrics,
    fixedProfile,
    dayContext,
    aiInput,
    seedScore,
    seedCategoryScores,
  } = body as AnalyzeRequestBody;

  if (!lifestyle || typeof lifestyle !== "object" || Array.isArray(lifestyle)) {
    return { ok: false, message: "生活習慣データが不足しています。" };
  }

  const confirmed =
    metrics && typeof metrics === "object" && !Array.isArray(metrics)
      ? normalizeMetrics(metrics)
      : undefined;

  // 確認済みメトリクスがある場合は画像不要（OCR 再実行を禁止）
  const imageList = Array.isArray(images) ? images : [];
  if (!confirmed && imageList.length === 0) {
    return {
      ok: false,
      message: "確認済みメトリクスまたは睡眠データ画像が必要です。",
    };
  }

  if (imageList.length > 0 && !imageList.every(isImageDataUrl)) {
    return {
      ok: false,
      message:
        "画像は JPEG / PNG / WEBP の data URL で送信してください。",
    };
  }

  const parsedSeedCategories = (() => {
    if (
      !seedCategoryScores ||
      typeof seedCategoryScores !== "object" ||
      Array.isArray(seedCategoryScores)
    ) {
      return undefined;
    }
    const record = seedCategoryScores as Record<string, unknown>;
    const pick = (key: string): number | null => {
      const value = record[key];
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return Math.max(0, Math.min(100, Math.round(value)));
    };
    const body = pick("body");
    const mind = pick("mind");
    const lifestyleScore = pick("lifestyle");
    const environment = pick("environment");
    if (
      body == null ||
      mind == null ||
      lifestyleScore == null ||
      environment == null
    ) {
      return undefined;
    }
    return {
      body,
      mind,
      lifestyle: lifestyleScore,
      environment,
    };
  })();

  return {
    ok: true,
    lifestyle,
    images: imageList,
    metrics: confirmed,
    fixedProfile:
      fixedProfile && typeof fixedProfile === "object"
        ? fixedProfile
        : undefined,
    dayContext:
      dayContext && typeof dayContext === "object" ? dayContext : undefined,
    aiInput: aiInput && typeof aiInput === "object" ? aiInput : undefined,
    seedScore:
      typeof seedScore === "number" && Number.isFinite(seedScore)
        ? Math.max(0, Math.min(100, Math.round(seedScore)))
        : undefined,
    seedCategoryScores: parsedSeedCategories,
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
  const seedScore = validated.seedScore;
  const seedCategoryScores = validated.seedCategoryScores;

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
    firstAnalysis: validated.aiInput?.firstAnalysis ?? null,
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
  if (validated.aiInput?.firstAnalysis) {
    aiInput.firstAnalysis =
      validated.aiInput.firstAnalysis.analysisDate !==
      aiInput.previousAnalysis?.analysisDate
        ? validated.aiInput.firstAnalysis
        : undefined;
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
${JSON.stringify(aiInput.previousAnalysis, null, 2)}
${
  aiInput.firstAnalysis
    ? `
【④-b 初回分析（長期変化の比較用。前回と異なる場合のみ）】
${JSON.stringify(aiInput.firstAnalysis, null, 2)}`
    : ""
}`
    : `【④ 前回分析】
前回分析なし。前回比較・初回比較には触れない。comparisonNarrative の vsPrevious / vsFirst は空文字 ""。`;

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

    const seedScoreBlock =
      typeof seedScore === "number"
        ? `【Sleep Wellness Score（先行確定・変更禁止）】
score = ${seedScore}
${
  seedCategoryScores
    ? `categoryScores（確定・変更禁止）:
  身体(body) = ${seedCategoryScores.body}
  心(mind) = ${seedCategoryScores.mind}
  生活(lifestyle) = ${seedCategoryScores.lifestyle}
  環境(environment) = ${seedCategoryScores.environment}`
    : "categoryScores は score と整合する値で出力すること。"
}
score / scoreBreakdown / categoryScores の数値自体を書き換えない。
scoreComment と categoryScoreRationales は、上記の確定点数のみを用いて解説する。
例: 「身体${seedCategoryScores?.body ?? "XX"}点」「心${seedCategoryScores?.mind ?? "XX"}点」。
確定点と異なる点数（例: 表示74なのに説明文で68）は絶対禁止。`
        : "";

    const response = await client.responses.create({
      model: "gpt-4o",
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `以下の4ソースを統合し、Sleep Wellness Institute Japan 認定講師が
カウンセリングに使える専門レポートを作成してください。

必須の思考順: 必須データを横断的に読む → 【最優先】データ根拠つきの良かった点を先に特定（最低2つ） → 複数指標を関連づけて「最重要課題・判断根拠・今回もっとも改善効果が高い行動」を整理 → プロフィールとの関連 → スコア解説＋4軸根拠（確定点数のみ） → 今日やる3つ（領域横断・完全個別化） → AI宿題（優先順位付き4〜6） → 次回比較ポイント → メラトニンヨガ™連携 → 前回・初回比較解説 → 講師へのカウンセリング提案（ヒアリング／次回比較／生活習慣／改善見込み／観察）。
改善点だけのレポートは絶対禁止。必ず最初に良かった点を書く。
単一データだけで判断しない。定型文（例:「飲酒を減らしましょう」）は禁止。一般論禁止。
必ず「なぜその判断か」「どのデータが根拠か」「データ同士の関連」を文章で説明する。
医療診断表現は禁止。「可能性があります」「考えられます」「参考として」「改善が期待できます」を用いる。
文章は専門的・高級感・安心感・前向きに。
Insight／今日やる3つ／AI宿題／講師提案は役割を混ぜず、同じ文言をコピーしない。
表示点数と説明文の点数は必ず一致させる。

優先順位: SOXAI実測 > 当日生活習慣 > 固定プロフィール > 前回分析 > 気象 > 一般参考基準。
固定プロフィールに無い項目は推測しない。前回が無い場合は前回比較に触れない。
前回の recommendationsUntilNext（AI宿題）がある場合は、checked（達成）/未達と達成率を可能性として参照し、今回の宿題に活かす。数値として上書きしない。

${metricsBlock}

${seedScoreBlock}

${dayContextBlock}

${fixedProfileBlock}

${previousBlock}

【必ずこの順で空欄なく生成】
① goodPoints＝データ根拠つきの良かった点（必ず2〜4件。数値を含め「なぜ良いか」を書く。省略・空・1件以下は禁止）
  例: 「深睡眠1時間38分が確保されているため、身体回復は比較的良好であると考えられます」
② improvements＝改善が期待できるポイント（重要度順・最大5件。{stars:5|4|3, text, whyNow}。goodPoints の後に書く）
  stars は内部ソート用。text に★やラベルは付けず、「何を整えるか」を書く。
  whyNow に「なぜ今それを優先するか」だけを書く（text の言い換え禁止）。
③ summary＝総合評価（120〜220文字）。必ず最初にデータ根拠つきの良かった点から書き始める。
③-b karteSummary＝Sleep Wellness Insight（診断記録のみ。行動リスト禁止）。
  必須構成（改行区切り）:
  ■今回最も重要な課題
  （1つに絞った課題・根拠数値を短く）
  ■判断の根拠
  （睡眠効率・覚醒時間・HRV・深睡眠・生活習慣・飲酒・体内時計など、該当データを「関連」で説明する。一般論禁止）
  ■今回もっとも改善効果が高い行動
  （最も改善効果が高い具体行動1つと、どのデータ関連からそう言えるか。箇条書き禁止）
  見出し込み 260〜500文字。
  前回あり: 課題→根拠→行動。初回: 「前回より」比較は禁止。
  summary の言い換え禁止。認定講師がそのまま説明できる品質で書く。
④ profileRelation＝プロフィールとの関連（短段落・根拠つき）
⑤ scoreComment＝睡眠ウェルネススコアの解説（短段落）。確定 score / categoryScores の点数のみ使用
⑤-b categoryScoreRationales＝身体・心・生活・環境それぞれ「なぜこの点数か」1〜2行（確定点数を必ず含める・空欄禁止）
⑥ todaysRecommendations＝今日やる3つ（必ずちょうど3件。睡眠データ／体内時計／ストレス／飲酒／運動／生活習慣から選ぶ。固定文・毎回同じテンプレ禁止）
⑦ nextComparisonPoints＝次回比較ポイント（2〜4件。次回見るべき観点の短文）
⑧ recommendationsUntilNext＝AI宿題（必ず4〜6件。先頭ほど優先。今日／今週／継続を配分。毎回自動生成。今日やる3つと同じ文言禁止）
⑨ instructorCounseling＝AIから講師への提案（goodPoints／needsImprovement／possibleFactors／questionCandidates。原因断定・改善提案の混同禁止）
⑩ melatoninYogaPlan＝メラトニンヨガ™連携（recommendedPhase／breathing／bathing／morningAction）
⑪ comparisonNarrative＝前回比較 vsPrevious・初回比較 vsFirst（初回は両方空文字 ""）

【絶対禁止】
- 改善点だけのレポート（良かった点を書かない／後回しにする／summary を改善点だけで始める）
- goodPoints が空・1件以下・数値根拠なし・改善点の言い換えになっていること
- improvements の text が定型文のみ／whyNow が空・text の言い換えであること
- karteSummary が空・見出し3構成（今回最も重要な課題／判断の根拠／今回もっとも改善効果が高い行動）でないこと
- karteSummary に一般論・行動リスト・宿題・講師ヒアリング文を書くこと
- 前回があるのに karteSummary で変化に触れないこと／初回なのに「前回より」と書くこと
- todaysRecommendations が 3件以外であること（必ずちょうど3件）
- todaysRecommendations に長文・抽象論・定型文・毎回同じテンプレ・入力と無関係な内容を書くこと
- recommendationsUntilNext が 4〜6件以外であること
- recommendationsUntilNext に観察観点だけの文言・今日やる3つと同じ文言・毎回同じ宿題を書くこと
- instructorCounseling が未記入／クライアント向け行動指示になっていること
- categoryScoreRationales の空欄・定型文のみ・確定点数と異なる点数
- melatoninYogaPlan の空欄
- Insight・今日やる3つ・AI宿題・講師提案の間で同じ文言をコピーすること
- 単一指標だけで状態を断定すること
- HRV・SpO₂だけで状態を断定しない
- 未測定・基準不明の項目を推測で埋めない
- 医療診断・治療・病名表現を使わない
- 単日だけで結論しない。「可能性があります」「考えられます」を使う
- 年齢・性別の一般基準比較は参考値のみ。病名断定禁止
- 年齢または性別が未入力なら「年齢・性別を考慮していない参考分析」と明記
- 画像の再OCR・再読取（確認済みメトリクスがある場合）
- 先行確定された Sleep Wellness Score / categoryScores の書き換え
- 表示点数と説明文の点数不一致（例: 身体74点なのに説明で68点）

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
      analysis = applyConfirmedMetrics(analysis, confirmedMetrics);
    }

    if (typeof seedScore === "number" && analysis && typeof analysis === "object") {
      const record = analysis as Record<string, unknown>;
      record.score = seedScore;
      if (seedCategoryScores) {
        record.categoryScores = seedCategoryScores;
      }
    }

    try {
      const { recordSystemActivity } = await import(
        "@/lib/admin/admin-service"
      );
      await recordSystemActivity({
        category: "analysis",
        action: "analyze",
        summary: "睡眠分析を実行しました",
        targetType: "analysis",
        payload: {
          clientName:
            typeof lifestyle?.clientName === "string"
              ? lifestyle.clientName
              : null,
        },
      });
      await recordSystemActivity({
        category: "ai",
        action: "openai_analysis",
        summary: "AI分析を利用しました",
        targetType: "analysis",
      });
    } catch {
      // activity log is best-effort
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
