import type { BreathingTechnique } from "@/lib/data/practice/types";

export const BREATHING_TECHNIQUES: readonly BreathingTechnique[] = [
  {
    id: "surya-bhedana",
    nameJa: "スーリヤベーダナ（太陽の呼吸）",
    nameSa: "Surya Bhedana",
    source: "hatha-yoga-pradipika",
    sourceNote:
      "『ハタヨーガ・プラディーピカー』第2章のクンバカの一つ。右鼻孔から吸い、左鼻孔から吐く温性・活性の呼吸。本プラットフォームでは保息を強制せず、自然な範囲にとどめる。",
    effect: "身体を温め、日中の活動モードへの切り替えを促す",
    timeOfDay: ["morning", "daytime"],
    ratio: "吸4 : 吐4〜6",
    dosage: "8〜12呼吸（約2〜4分）／朝または日中",
    kumbhaka: "natural",
    steps: [
      "楽な座位。背骨を長くし、肩と顎の力を抜く。",
      "右手をヴィシュヌムドラー（人差し指と中指を折る）にする。",
      "薬指で左鼻孔を軽く閉じ、右鼻孔から静かに吐き切る（準備の1呼吸）。",
      "右鼻孔から4カウントで吸う。",
      "親指で右鼻孔を閉じ、左鼻孔から4〜6カウントで吐く。",
      "これで1呼吸。8〜12呼吸くり返す。",
      "終えたら手を下ろし、自然呼吸のまま2〜3呼吸だけ「間」を味わう。",
    ],
    contraindications: [
      {
        condition: "高血圧・強い興奮・発熱",
        severity: "avoid",
        note: "活性が強いため、夜および過緊張時は行わない",
      },
      {
        condition: "鼻閉・副鼻腔炎",
        severity: "caution",
        note: "無理に片鼻を使わず、ウジャイまたは呼気延長へ置き換える",
      },
    ],
    maNote: "吸い終わりを急がず、次の呼気までの短い静止を「間」として残す。",
  },
  {
    id: "ujjayi",
    nameJa: "ウジャイ",
    nameSa: "Ujjayi",
    source: "hatha-yoga-pradipika",
    sourceNote:
      "『ハタヨーガ・プラディーピカー』第2章のクンバカの一つ。喉を細めて呼吸を均一にする。夜は音を小さく、呼気を長めにする。",
    effect: "呼吸をそろえ、注意を内側へ集める",
    timeOfDay: ["morning", "daytime", "evening", "night"],
    ratio: "吸4 : 吐4〜6（夜は吐6〜8）",
    dosage: "10〜15呼吸（約3〜5分）",
    kumbhaka: "none",
    steps: [
      "楽な座位、または仰向け。口は閉じる。",
      "喉の奥をわずかに狭め、鼻から静かに吸う（小さな海の音程度）。",
      "同じ細さで、鼻から4〜6カウント吐く。夜は6〜8カウント。",
      "音は自分に聞こえる大きさまで。周囲に響かせない。",
      "10〜15呼吸くり返す。",
      "終えたら喉の力を抜き、自然呼吸で3呼吸静止する。",
    ],
    contraindications: [
      {
        condition: "喉の炎症・強い咳",
        severity: "caution",
        note: "音を出さず、呼気延長のみにする",
      },
      {
        condition: "めまい・過呼吸傾向",
        severity: "caution",
        note: "回数を半分にし、途中でやめてよい",
      },
    ],
    maNote: "音の切れ目ではなく、呼気の終わりの静けさを「間」とする。",
  },
  {
    id: "sitali",
    nameJa: "シータリー",
    nameSa: "Sitali",
    source: "hatha-yoga-pradipika",
    sourceNote:
      "『ハタヨーガ・プラディーピカー』第2章のクンバカの一つ。舌を筒状にして吸う冷性の呼吸。舌が丸まらない人はシートカーリーへ置き換える。",
    effect: "熱感を鎮め、日中〜夕方の興奮を冷ます",
    timeOfDay: ["daytime", "evening"],
    ratio: "吸4 : 吐6",
    dosage: "8〜12呼吸（約2〜4分）",
    kumbhaka: "none",
    steps: [
      "楽な座位。肩の力を抜く。",
      "舌を外へ出し、可能なら筒状に丸める。",
      "筒にした舌から4カウントで涼しい空気を吸う。",
      "舌を戻し、口を閉じて鼻から6カウント吐く。",
      "8〜12呼吸くり返す。",
      "終えたら唇を閉じ、自然呼吸で2呼吸静止する。",
    ],
    contraindications: [
      {
        condition: "舌が丸まらない",
        severity: "caution",
        note: "シートカーリーへ置き換える",
      },
      {
        condition: "喘息の急性期・強い冷え",
        severity: "caution",
        note: "冷性刺激を避け、ウジャイまたは呼気延長にする",
      },
    ],
    maNote: "冷たい吸気のあとに残る静けさを急いで埋めない。",
  },
  {
    id: "sitkari",
    nameJa: "シートカーリー",
    nameSa: "Sitkari",
    source: "hatha-yoga-pradipika",
    sourceNote:
      "『ハタヨーガ・プラディーピカー』第2章のクンバカの一つ。歯の間から吸う冷性の呼吸。シータリーができない場合の代替。",
    effect: "熱感を鎮め、知覚を落ち着ける",
    timeOfDay: ["daytime", "evening"],
    ratio: "吸4 : 吐6",
    dosage: "8〜12呼吸（約2〜4分）",
    kumbhaka: "none",
    steps: [
      "楽な座位。歯を軽く合わせ、唇は開く。",
      "歯の隙間から「スー」と4カウント吸う。",
      "唇を閉じ、鼻から6カウント吐く。",
      "8〜12呼吸くり返す。",
      "歯や歯茎に痛みが出たら中止する。",
      "終えたら口を閉じ、自然呼吸で2呼吸静止する。",
    ],
    contraindications: [
      {
        condition: "知覚過敏・歯の痛み・矯正中",
        severity: "avoid",
        note: "冷気を歯に当てない。呼気延長へ置き換える",
      },
      {
        condition: "強い冷え・冬の屋外",
        severity: "caution",
      },
    ],
    maNote: "吐いたあとの口の中の静けさを、次の吸気より先に味わう。",
  },
  {
    id: "bhastrika",
    nameJa: "バストリカー",
    nameSa: "Bhastrika",
    source: "hatha-yoga-pradipika",
    sourceNote:
      "『ハタヨーガ・プラディーピカー』第2章のクンバカの一つ。強い活性の呼吸。朝のみ行う。",
    effect: "眠気を払い、朝の活動を立ち上げる",
    timeOfDay: ["morning"],
    ratio: "吸と吐を同じ速さで短く",
    dosage: "1セット10回 × 1〜2セット（合計1分以内）／朝のみ",
    kumbhaka: "none",
    steps: [
      "安定した座位。腹をゆるめる。",
      "鼻から短く吸い、短く吐く。ポンプのように同じ速さで10回。",
      "10回のあと、自然呼吸で3呼吸休む。",
      "調子がよければもう1セットだけ行う。",
      "めまい・動悸が出たら直ちに中止し、自然呼吸に戻る。",
      "終えたら肩を下ろし、30秒静止する。",
    ],
    contraindications: [
      {
        condition: "高血圧・心疾患・妊娠・てんかん・眼圧が高い",
        severity: "avoid",
        note: "行わない。朝はスーリヤベーダナまたはウジャイにする",
      },
      {
        condition: "夕方以降・就寝前",
        severity: "avoid",
        note: "夜は絶対に行わない",
      },
    ],
    maNote: "セットとセットのあいだの静止を省かない。活性のあとに「間」を置く。",
  },
  {
    id: "bhramari",
    nameJa: "蜂の呼吸法（ブラーマリー）",
    nameSa: "Bhramari",
    bookName: "蜂の呼吸法（『かんたんお風呂ヨガ』P141）",
    source: "hatha-yoga-pradipika",
    sourceNote:
      "『ハタヨーガ・プラディーピカー』第2章のクンバカの一つ。書籍では「蜂の呼吸法」「黒蜂の呼吸法」と表記される箇所がある。本プラットフォームでは「蜂の呼吸法（ブラーマリー）」に統一する。入浴後の締めとして既定。",
    effect: "神経系を鎮め、入眠準備を整える",
    timeOfDay: ["evening", "night"],
    ratio: "吸4 : 吐8（ハミング）",
    dosage: "5〜10呼吸（約2〜4分）／入浴後・就寝前",
    kumbhaka: "none",
    steps: [
      "楽な座位。耳を指で軽くふさぐか、目を閉じる。",
      "鼻から4カウントで吸う。",
      "口は閉じたまま、喉の奥で蜂が飛ぶような「ンー」を8カウント鳴らして吐く。",
      "音は小さくてよい。頭の中に響く程度。",
      "5〜10呼吸くり返す。",
      "終えたら手を下ろし、余韻の静けさを3呼吸味わう。",
    ],
    contraindications: [
      {
        condition: "重度の耳疾患・強い頭痛",
        severity: "caution",
        note: "ハミングをやめ、呼気延長のみにする",
      },
      {
        condition: "就寝直前の大きな声",
        severity: "caution",
        note: "音量を最小にする",
      },
    ],
    maNote: "ハミングが消えたあとの沈黙が「間」。すぐに次の吸気を始めない。",
  },
  {
    id: "nadi-shodhana",
    nameJa: "片鼻呼吸法（左右交互）",
    nameSa: "Nadi Shodhana",
    bookName: "片鼻呼吸法（『かんたんお風呂ヨガ』P140）",
    source: "traditional-later",
    sourceNote:
      "伝統的呼吸法の応用。左右の鼻孔を交互に使う。書籍P140の片鼻呼吸法の、日中の既定対応。夜の既定はチャンドラベーダナ（片方向）とする。",
    effect: "自律神経のバランスをとり、日中の過緊張を整える",
    timeOfDay: ["morning", "daytime", "evening", "night"],
    ratio: "吸4 : 吐4〜6",
    dosage: "8〜16呼吸（約3〜5分）／日中の入浴後の締め",
    kumbhaka: "none",
    steps: [
      "楽な座位。右手をヴィシュヌムドラーにする。",
      "右鼻孔を親指で閉じ、左鼻孔から4カウント吸う。",
      "左を薬指で閉じ、右鼻孔から4〜6カウント吐く。",
      "右鼻孔から4カウント吸う。",
      "右を閉じ、左鼻孔から4〜6カウント吐く。これで1往復。",
      "4〜8往復くり返す。",
      "終えたら手を下ろし、自然呼吸で3呼吸静止する。",
    ],
    contraindications: [
      {
        condition: "鼻閉・副鼻腔炎",
        severity: "caution",
        note: "通っている鼻だけ、または呼気延長にする",
      },
      {
        condition: "強い眠気（運転前）",
        severity: "caution",
        note: "日中の長時間実施を避ける",
      },
    ],
    maNote: "左右を切り替える瞬間を急がず、指が触れたあとに1拍おく。",
  },
  {
    id: "chandra-bhedana",
    nameJa: "チャンドラベーダナ（月の呼吸）",
    nameSa: "Chandra Bhedana",
    bookName: "片鼻呼吸法の応用（『かんたんお風呂ヨガ』P140）",
    source: "traditional-later",
    sourceNote:
      "『ハタヨーガ・プラディーピカー』本文には記載がなく、後代のハタヨーガ文献・伝統的実践に基づく。太陽の呼吸（スーリヤベーダナ）の対となる月の呼吸。",
    effect: "身体を鎮め、活動モードから休息モードへの切り替えを促す",
    timeOfDay: ["evening", "night"],
    ratio: "吸4 : 吐6〜8",
    dosage: "10〜20呼吸（約3〜5分）／入浴後・就寝60〜90分前",
    kumbhaka: "none",
    steps: [
      "楽な座位。背骨を長く、肩と顎の力を抜く。",
      "右手をヴィシュヌムドラー（人差し指と中指を折る）にする。",
      "薬指で左鼻孔を閉じ、右鼻孔から静かに吐き切る（準備の1呼吸）。",
      "親指で右鼻孔を閉じ、左鼻孔から4カウントで吸う。",
      "左鼻孔を薬指で閉じ、右鼻孔から6〜8カウントで吐く。",
      "これで1呼吸。10〜20呼吸くり返す。",
      "終えたら手を下ろし、自然呼吸のまま3呼吸だけ「間」を味わう。",
    ],
    contraindications: [
      {
        condition: "鼻閉・副鼻腔炎",
        severity: "caution",
        note: "無理に片鼻を使わず、呼気延長のみに置き換える",
      },
      {
        condition: "低血圧・強い倦怠感",
        severity: "caution",
      },
    ],
    maNote:
      "吐き終わりに生まれるわずかな静止が「間」。次の吸気を急がないことが、眠りへの入口になる。",
  },
  {
    id: "exhale-extension",
    nameJa: "呼気延長",
    nameSa: "Exhale Extension",
    source: "modern",
    sourceNote:
      "現代の呼吸法。保息を使わず、吐く息を吸う息より長くする。日中の自律訓練法のあとは 吸4:吐6。夜・入浴後の入口としては 吸4:吐8。",
    effect: "副交感神経を優位にし、初学者でも安全に鎮まる",
    timeOfDay: ["daytime", "evening", "night"],
    ratio: "日中 吸4 : 吐6 ／ 夜 吸4 : 吐8",
    dosage: "10〜20呼吸（約3〜5分）",
    kumbhaka: "none",
    steps: [
      "楽な座位または仰向け。口は閉じ、鼻で呼吸する。",
      "4カウントで静かに吸う。肩を上げない。",
      "日中は6カウント、夜は8カウントで細く吐く。",
      "吐き切れなくても途中で次の吸気に入ってよい。",
      "10〜20呼吸くり返す。",
      "終えたらカウントをやめ、自然呼吸で3呼吸静止する。",
    ],
    contraindications: [
      {
        condition: "強い息苦しさ・喘息の急性期",
        severity: "caution",
        note: "吐く長さを無理に伸ばさない",
      },
      {
        condition: "過呼吸傾向",
        severity: "caution",
        note: "回数を10回までにし、途中でやめてよい",
      },
    ],
    maNote: "吐いたあとの空白を埋めない。次の吸いは、空白のあとに来る。",
  },
];

export const BREATHING_BY_ID: Readonly<Record<string, BreathingTechnique>> =
  Object.fromEntries(BREATHING_TECHNIQUES.map((item) => [item.id, item]));

export const NIGHT_FORBIDDEN_BREATHING_IDS = [
  "bhastrika",
  "surya-bhedana",
] as const;

export function isNightForbiddenBreathing(id: string): boolean {
  return (NIGHT_FORBIDDEN_BREATHING_IDS as readonly string[]).includes(id);
}
