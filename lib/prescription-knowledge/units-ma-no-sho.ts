import type { PrescriptionUnit } from "@/lib/prescription-knowledge/types";

/**
 * 『間の書』の考え方。
 * 養成講座公式テキストが明示的に参照している記述のみを用いる。
 * Ver.1 は「間」の A（一呼吸の間など）だけを自動選択する。
 */
export const MA_NO_SHO_UNITS: readonly PrescriptionUnit[] = [
  {
    id: "mns-breath-gap",
    source: "ma_no_sho",
    kind: "ma",
    autoSelectable: true,
    slot: "ma",
    themes: ["sleep_onset", "recovery"],
    title: "一呼吸の間",
    body: "『間の書』でも、刺激と反応の間に一呼吸入れることの大切さが繰り返し語られています。考える前に反応せず、吸って、吐いて、そのあいだの静けさに気づくことから始めてください。",
  },
  {
    id: "mns-stimulus",
    source: "ma_no_sho",
    kind: "ma",
    autoSelectable: false,
    slot: "ma",
    themes: [],
    title: "刺激と反応のあいだ",
    body: "『間の書』は、刺激が来る・すぐ反応する・また刺激が来る、という繰り返しを「刺激と反応の間が失われた状態」と表現します。反応する前に、一呼吸だけ「間」を入れてください。",
  },
  {
    id: "mns-not-broken",
    source: "ma_no_sho",
    kind: "ma",
    autoSelectable: false,
    slot: "ma",
    themes: [],
    title: "合っていないだけ",
    body: "あなたは壊れているのではなく、合っていないだけ、と『間の書』は示します。眠れないことを弱さや根性の問題にせず、リズムのずれとして整えていく視点を大切にします。",
  },
  {
    id: "mns-return",
    source: "ma_no_sho",
    kind: "rest",
    autoSelectable: false,
    slot: "todays_one",
    themes: [],
    title: "眠りは還るもの",
    body: "眠りは、手に入れるものではない。還るものである。眠ろうとするほど眠れないことがあるからこそ、「する」を減らし、身体が安心できる状態へ還ることを優先します。",
  },
  {
    id: "mns-five-ma",
    source: "ma_no_sho",
    kind: "ma",
    autoSelectable: false,
    slot: "ma",
    themes: [],
    title: "五つの「間」",
    body: "現代人は、時間・空間・仲間・世間・人間という五つの「間」を失いやすい、と『間の書』は指摘します。今日は、通知にすぐ反応しない一回、空を見る一回など、失われやすい余白を一つだけ取り戻してください。",
  },
];
