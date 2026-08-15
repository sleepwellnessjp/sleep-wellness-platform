import type { PrescriptionUnit } from "@/lib/prescription-knowledge/types";

/**
 * 『間のヨガ Sleep Wellness Method™養成講座テキスト』からの処方ユニット。
 * Ver.1 は A（呼吸・間・一本の聞き方等）だけを自動選択する。
 */
export const MA_NO_YOGA_UNITS: readonly PrescriptionUnit[] = [
  {
    id: "mny-todays-maintain",
    source: "ma_no_yoga",
    kind: "lifestyle",
    autoSelectable: true,
    slot: "todays_one",
    themes: ["maintain"],
    title: "いちばん変えやすい一本",
    reason:
      "8つを同時に始める必要はありません。公式テキストは、すでにある習慣を少し動かす一本から始めることを示しています。",
    body: "今日は新しい改善メニューを増やさず、いちばん変えやすい柱を一つだけ続けてください。まずは一つだけ、生活を変えてみてください。",
  },
  {
    id: "mny-todays-review",
    source: "ma_no_yoga",
    kind: "lifestyle",
    autoSelectable: true,
    slot: "todays_one",
    themes: ["individual_review"],
    title: "生活を聞いて一本",
    reason:
      "公式テキストは、相手の生活を聞き、いちばん変えやすい柱を一本だけ選ぶことを示しています。分類しきれないときは、先に実践を決めません。",
    body: "ポーズや新しい実践を先に決めず、生活の流れを聞いてから、いちばん変えやすい柱を一つ選んでください。",
  },
  {
    id: "mny-breath",
    source: "ma_no_yoga",
    kind: "breathing",
    autoSelectable: false,
    slot: "breathing",
    themes: [],
    title: "息を吐いて休息へ",
    body: "緊張すると呼吸は浅くなり、安心すると深くなります。ゆっくりと息を吐くことで、身体は休息へ向かいます。呼吸は、身体と心をつなぐ橋渡しです。",
  },
  {
    id: "mny-ma-daily",
    source: "ma_no_yoga",
    kind: "ma",
    autoSelectable: true,
    slot: "ma",
    themes: ["maintain"],
    title: "日常の中の「間」",
    body: "呼吸の間。会話の間。食事の間。歩く間。仕事の間。眠る前の間。特別な時間ではなく、毎日の生活の中にある小さな静けさです。全部やろうとせず、毎日三つできれば十分です。",
  },
  {
    id: "mny-life-continue",
    source: "ma_no_yoga",
    kind: "lifestyle",
    autoSelectable: false,
    slot: "todays_one",
    themes: [],
    title: "完璧より、戻ること",
    body: "睡眠は一日で大きく変わるものではありません。できなかった日があっても構いません。大切なのは責めることではなく、また本来のリズムへ戻ることです。",
  },
  {
    id: "mny-life-night",
    source: "ma_no_yoga",
    kind: "lifestyle",
    autoSelectable: false,
    slot: "night",
    themes: [],
    title: "夜の光と画面を減らす",
    body: "夜遅くまで明るい部屋で過ごしたり、画面を見続けたりすると、脳は昼間だと勘違いしやすくなります。照明を少し暗くし、スマートフォンを見る時間を減らすことから始めてください。",
  },
  {
    id: "mny-life-bath",
    source: "ma_no_yoga",
    kind: "lifestyle",
    autoSelectable: false,
    slot: "bathing",
    themes: [],
    title: "ぬるめの入浴",
    body: "就寝の1時間半〜2時間ほど前に、ぬるめのお湯でゆっくり入浴します。身体が温まり、その後ゆっくり体温が下がる過程で、自然な眠気が訪れます。熱すぎるお湯はかえって身体を覚醒させます。",
  },
  {
    id: "mny-life-meal",
    source: "ma_no_yoga",
    kind: "lifestyle",
    autoSelectable: false,
    slot: "todays_one",
    themes: [],
    title: "食事のリズム",
    body: "食べる内容だけでなく、食べる時間、よく噛むこと、規則正しい食生活も睡眠リズムを整えます。夕食は就寝の3時間前までが目安です。",
  },
];
