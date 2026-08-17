import type { BathComplaintKey, BathProtocol } from "@/lib/data/practice/types";

const BOOK = "早坂信哉・若林貴久『かんたんお風呂ヨガ』";

const AROMA_NOTE =
  "アロマオイルは湯船に直接入れない。洗面器に湯を張り2〜3滴たらして浴室に置く。ラベンダーやヒノキの香りがストレスマーカーを減少させたとの報告があります。香りを楽しむ場合は40℃までのぬるめの湯が推奨。";

const NIGHT_POST_BREATHING = ["chandra-bhedana", "bhramari"] as const;
const DAY_POST_BREATHING = ["nadi-shodhana", "bhramari"] as const;

const COMMON_BATH_CAUTIONS = [
  "飲酒後の入浴は避ける。",
  "のぼせ・めまいが出たら直ちに上がる。",
  "湯冷めしないよう、上がったら保温する。",
] as const;

export const BATH_PROTOCOLS: readonly BathProtocol[] = [
  {
    id: "basic-40-10",
    nameJa: "基本の入浴法",
    purpose: "就寝前の標準。深部体温を一度上げ、その後の下降で入眠をサポートする",
    temperature: "40℃",
    duration: "10分",
    style: "全身浴",
    timing: "就寝の90分前（就寝1〜2時間前に入浴を完了させる）",
    steps: [
      "入浴前に水分を摂る。",
      "40℃の湯に肩まで浸かる。",
      "合計10分を目安に上がる。浴室が寒く発汗がない場合は少し長めでもよい。",
      "上がったら水分を摂り、湯冷めしないうちに就寝準備へ。",
      "入浴の90分後を目安に就寝する。",
    ],
    preYoga: [],
    postYoga: [],
    postBreathing: [...NIGHT_POST_BREATHING],
    cautions: [...COMMON_BATH_CAUTIONS],
    sourceNote: `${BOOK} P30「基本の入浴法」／P66「寝る前ゆるっとシニアヨガ」より。`,
    maNote: "上がったあとの体温が静かに下がる時間を、次の刺激で埋めない。",
    options: { aroma: AROMA_NOTE },
  },
  {
    id: "calm-38-20",
    nameJa: "ぬる湯じっくり浴",
    purpose: "イライラ・興奮の鎮静。副交感神経への切り替え、入眠困難",
    temperature: "38℃",
    duration: "合計20分",
    style: "全身浴（つらい場合は半身浴可）",
    timing: "就寝1〜2時間前",
    steps: [
      "38℃のぬるめの湯を張る（38〜40℃で副交感神経へ切り替わりやすい）。",
      "飲み物を浴室に持ち込み、途中で水分を摂る。",
      "合計20分を目安に浸かる。連続でなくてよく、出たり入ったりしてもよい。",
      "全身浴がつらい場合は半身浴に変更する。",
      "就寝の1〜2時間前に入浴を終える。",
    ],
    preYoga: [],
    postYoga: ["child-pose", "legs-up-the-wall", "supine-twist"],
    postBreathing: [...NIGHT_POST_BREATHING],
    cautions: [
      "飲酒後の入浴は避ける。",
      "のぼせ・めまいが出たら直ちに上がる。",
      "ぬるめの湯なので湯冷めに注意。上がったらすぐに保温する。",
    ],
    sourceNote: `${BOOK} P86「イライラ解消、快眠ゆるっとヨガ」より。`,
    maNote: "出たり入ったりする合間の静止も、実践の一部として残す。",
    options: { aroma: AROMA_NOTE },
  },
  {
    id: "calm-38-carbonated",
    nameJa: "ぬる湯短時間＋炭酸系入浴剤",
    purpose: "時間がない日の鎮静。38℃の弱い血管拡張を炭酸系入浴剤で補う",
    temperature: "38℃",
    duration: "10〜15分",
    style: "全身浴＋炭酸系入浴剤",
    timing: "就寝1〜2時間前",
    steps: [
      "38℃の湯を張り、炭酸系入浴剤を用いる。",
      "38℃は40℃に比べ血管拡張作用が弱いため、炭酸系で補う。",
      "10〜15分浸かり、のぼせないうちに上がる。",
      "上がったら椅子版のポーズへ移る（床に横になれない日の想定）。",
    ],
    preYoga: [],
    postYoga: [
      "chair-child-pose",
      "chair-legs-up-the-wall",
      "chair-twist",
      "chair-savasana",
    ],
    postBreathing: [...NIGHT_POST_BREATHING],
    cautions: [
      ...COMMON_BATH_CAUTIONS,
      "入浴剤の注意書きを守る。肌が弱い場合は入浴剤を使わず38℃のみにする。",
    ],
    sourceNote: `${BOOK}「イライラ解消、快眠ゆるっとヨガ〔椅子版〕」より。`,
    maNote: "短い湯時間のあとに、椅子の上で静止を十分にとる。",
    options: { aroma: AROMA_NOTE },
  },
  {
    id: "morning-42-shower",
    nameJa: "朝の活性シャワー",
    purpose: "朝の切り替え。日中のリズム立ち上げ。夜の入浴とは目的が逆",
    temperature: "42℃（湯船なら41〜42℃）",
    duration: "5分",
    style: "シャワー（ゆっくり入浴できる場合は湯船5分）",
    timing: "起床後。夜には用いない",
    steps: [
      "水分補給をしてから始める。",
      "手足の末端に十分かけ湯またはシャワーを浴びてから、熱めの湯を体幹へ（急な血圧上昇を避ける）。",
      "42℃のシャワーを5分。ゆっくり入浴できる場合は41〜42℃の湯に5分。",
      "朝に夜のように長く浸からない。1〜2時間後に眠くなることがある。",
    ],
    preYoga: [],
    postYoga: [],
    postBreathing: [...DAY_POST_BREATHING],
    cautions: [
      "水分補給と末端へのかけ湯を先に行う。",
      "高血圧・心疾患がある場合は温度を下げ、医療者に確認する。",
      ...COMMON_BATH_CAUTIONS,
    ],
    sourceNote: `${BOOK}「朝のゆるっと元気ヨガ」より。`,
    maNote: "熱めの刺激のあとに、片鼻呼吸法までの短い静止を置く。",
    options: { aroma: AROMA_NOTE },
  },
  {
    id: "lowback-40-15",
    nameJa: "腰いたわり浴",
    purpose: "腰の重さ・慢性的な腰の緊張。この回は入浴が先、ヨガが後",
    temperature: "40℃",
    duration: "15分",
    style: "全身浴・湯は深めに",
    timing: "就寝1〜2時間前",
    steps: [
      "40℃の湯を深めに張る（浮力で腰の負荷が軽くなる）。",
      "15分を目安に浸かる。",
      "5分浸かって筋肉がゆるんだら、座ったまま浴槽の縁を両手で持って上半身を左右にゆっくりひねる。左右で計5回程度。",
      "シャワーのみの場合は、42℃程度のシャワーを腰に5〜10分、やや強めに当てる（圧注浴の考え方）。",
      "上がってからヨガを行う（温めてからのほうが動きやすい）。",
    ],
    preYoga: [],
    inBath: ["in-bath-twist"],
    postYoga: ["moon-pose", "child-pose", "thread-the-needle"],
    postBreathing: [...NIGHT_POST_BREATHING],
    cautions: [
      "浴槽内は滑るため慎重に。縁を両手で持つ。",
      "急性の強い腰痛・しびれがある場合は医療者に相談し、ねじりを省く。",
      ...COMMON_BATH_CAUTIONS,
    ],
    sourceNote: `${BOOK}「重〜い腰に効く、ゆるっとほぐしヨガ」より。`,
    maNote: "ねじりの回数を急がず、左右のあいだに1呼吸おく。",
    options: { aroma: AROMA_NOTE },
  },
  {
    id: "shoulder-40-10",
    nameJa: "肩まで浸かる浴",
    purpose: "肩こり。肩が湯から出やすいので、意識して肩まで浸ける",
    temperature: "40℃",
    duration: "10分",
    style: "全身浴（肩を必ず湯中に）",
    timing: "就寝1〜2時間前",
    steps: [
      "40℃の湯に、肩まで必ず浸ける。",
      "10分を目安に浸かる。",
      "5分浸かってから、無理のない範囲でネックストレッチ、牛の顔のポーズを湯船の中で行う。",
      "シャワーのみの場合は、42℃のシャワーを高い位置から肩に強めに、片側5分ずつ当てる。",
    ],
    preYoga: [],
    inBath: ["in-bath-neck-stretch", "in-bath-cow-face"],
    postYoga: ["neck-stretch", "eagle", "cow-face"],
    postBreathing: [...NIGHT_POST_BREATHING],
    cautions: [
      "浴槽内は滑るため慎重に。",
      "首を大きく回さない。痛みが出たら直ちに中止する。",
      ...COMMON_BATH_CAUTIONS,
    ],
    sourceNote: `${BOOK}「つらい肩こりに効く、ゆるっとほぐしヨガ」より。`,
    maNote: "肩が沈んだあとのゆるみを、すぐに次のポーズで埋めない。",
    options: { aroma: AROMA_NOTE },
  },
  {
    id: "legs-contrast",
    nameJa: "下肢プチ温冷交代浴",
    purpose: "歩き回った日の下肢疲労",
    temperature: "40℃と25〜30℃の交代",
    duration: "約11分（40℃3分 → 冷1分 → 40℃3分 → 冷1分 → 40℃3分）",
    style: "全身浴＋下肢へのぬるま湯",
    timing: "就寝1〜2時間前",
    steps: [
      "40℃の湯に3分、全身浴。",
      "25〜30℃程度のぬるま湯を1分間、膝から下にかける。",
      "①②をもう一度繰り返す。",
      "最後にもう一度①（40℃3分の全身浴）を行って終了。",
    ],
    preYoga: ["supine-leg-stretch", "crescent", "legs-up-the-wall", "savasana"],
    postYoga: [],
    postBreathing: [...NIGHT_POST_BREATHING],
    cautions: [
      "心臓に疾患のある方、脳卒中を経験した方は、必ず主治医に確認してから行う。",
      ...COMMON_BATH_CAUTIONS,
    ],
    sourceNote: `${BOOK}「足が軽くなる！ゆるっとヨガ」より。`,
    maNote: "温と冷の切り替わりの直後に、1呼吸だけ静止する。",
    options: { aroma: AROMA_NOTE },
  },
  {
    id: "partial-warmup",
    nameJa: "部分浴（手浴・足湯）",
    purpose: "湯船が使えない環境・外出先・出張先",
    temperature: "手浴42℃目安／足湯は多少熱いと感じる程度",
    duration: "手浴10分／足湯20分",
    style: "手浴 / 足湯 / 出張先のくるぶし浴＋シャワー",
    timing: "就寝1〜2時間前、または外出先で温まりたいとき",
    steps: [
      "手浴: 洗面器やシンクに少し熱めの湯（42℃目安）を張り、手首まで10分。手のひらの動静脈吻合が広がり全身がほんのり温まる。入浴剤があれば湯量に合わせて使うと効果が長続きする。",
      "足湯: できればふくらはぎまで浸かる深さで20分ほど。多少熱いと感じる程度でよい。終わったら冷えないようタオルで拭く（事前にタオルを準備）。",
      "出張先: 浴槽にくるぶしほどの少し熱めの湯を張り、立って足湯をしながらシャワーを浴びる。最後に栓を抜いて足元をシャワーで流す。シャワーだけより温まる。",
    ],
    preYoga: [],
    postYoga: ["chair-child-pose", "chair-savasana"],
    postBreathing: [...NIGHT_POST_BREATHING],
    cautions: [
      "熱すぎる湯でやけどしない。最初は手や足の甲で温度を確かめる。",
      "終わったあと湯冷めしやすいので、すぐに拭いて保温する。",
      ...COMMON_BATH_CAUTIONS,
    ],
    sourceNote: `${BOOK}「次の日が楽になる！ゆるっと回復ヨガ」「足が軽くなる！ゆるっとヨガ〔椅子版〕」より。`,
    maNote: "部分浴でも、上がったあとの静止と呼吸法は省略しない。",
    options: { aroma: AROMA_NOTE },
  },
];

export const BATH_BY_ID: Readonly<Record<string, BathProtocol>> = Object.fromEntries(
  BATH_PROTOCOLS.map((item) => [item.id, item]),
);

/**
 * 身体の訴えによる入浴上書き。データとして保持するが、
 * 今フェーズの getPrescription では参照しない。
 */
export const COMPLAINT_BATH_OVERRIDE: Readonly<Record<BathComplaintKey, string>> = {
  lowback: "lowback-40-15",
  shoulder: "shoulder-40-10",
  legs: "legs-contrast",
  no_tub: "partial-warmup",
  no_time: "calm-38-carbonated",
};
