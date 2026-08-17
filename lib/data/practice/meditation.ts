import type { MeditationPractice } from "@/lib/data/practice/types";

export const MEDITATION_PRACTICES: readonly MeditationPractice[] = [
  {
    id: "body-scan",
    nameJa: "ボディスキャン",
    duration: "5〜10分",
    timeOfDay: ["night"],
    steps: [
      "仰向けまたは楽な座位。目を閉じる。",
      "足先から順に、感覚がある場所へ注意を移す。",
      "踵・ふくらはぎ・膝・腿・骨盤・腹・胸・肩・腕・顔。",
      "感覚を変えようとせず、あるものを観察する。",
      "頭まで届いたら、全身を一度に感じ、自然呼吸で終わる。",
    ],
    cautions: [
      "途中で眠ってもよい。無理に起こさない。",
      "痛みに注意が固着したら、その部位を飛ばして先へ進む。",
    ],
    maNote: "部位と部位のあいだの空白に、注意を1呼吸だけ置く。",
  },
  {
    id: "breath-counting",
    nameJa: "数息観",
    duration: "3〜5分",
    timeOfDay: ["daytime", "night"],
    steps: [
      "楽な座位。背骨を長くし、目を閉じるか半眼にする。",
      "吐く息を「1」と数え、次の吐く息を「2」とする。",
      "10まで数えたら、また1に戻る。吸う息は数えない。",
      "途中で数を忘れたら、責めずに1へ戻る。",
      "3〜5分で目を開け、肩を一度回す。",
    ],
    cautions: [
      "眠気で数えられなくなったら中止してよい。",
      "日中の運転前には行わない。",
    ],
    maNote: "数字と数字のあいだ、吐き終わったあとの静止が「間」。",
  },
  {
    id: "ma-awareness",
    nameJa: "「間」の瞑想",
    duration: "5分",
    timeOfDay: ["night"],
    steps: [
      "楽な座位または仰向け。照明を落とす。",
      "鼻の呼吸を観察する。長さは操作しない。",
      "呼気が終わったあと、吸気が始まる前の切れ目に注意を置く。",
      "切れ目が見つからなくてもよい。探そうと力まない。",
      "5分で目を開け、そのままシャヴァーサナへ入る。",
    ],
    cautions: [
      "呼吸を止めない。切れ目は自然に訪れる短い静止である。",
      "不安が強まるときは数息観へ切り替える。",
    ],
    maNote: "呼気と吸気の切れ目そのものが、間のヨガ™の中核である。",
  },
  {
    id: "bath-meditation",
    nameJa: "お風呂瞑想",
    duration: "入浴中（のぼせない範囲）",
    timeOfDay: ["evening", "night"],
    sourceNote:
      "早坂信哉・若林貴久『かんたんお風呂ヨガ』P54 コラム「かんたんお風呂瞑想」より。早坂先生は同書P91で「マインドフロネス」として紹介。",
    steps: [
      "自分の体温に近いぬるめの湯を溜める。",
      "入浴前に片鼻呼吸法（夜はチャンドラベーダナ、昼はナーディショーダナ）を行い、意識を内側へ向ける。",
      "湯船に浸かり、体と湯の境目の感覚をただ観察する。",
      "境目が曖昧になっていく感覚をそのまま味わう。",
      "のぼせないよう時間を決めて上がる。",
    ],
    cautions: [
      "ぬるめの湯なので湯冷めに注意。上がったらすぐに保温する。",
      "眠気が出ることがあるため、湯船での居眠りを避ける。長湯しない。",
    ],
    maNote: "体と湯の境目がゆるむ感覚を、次の動作で埋めない。",
  },
];

export const MEDITATION_BY_ID: Readonly<Record<string, MeditationPractice>> =
  Object.fromEntries(MEDITATION_PRACTICES.map((item) => [item.id, item]));
