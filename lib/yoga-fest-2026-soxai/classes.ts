/**
 * ヨガフェスタ横浜2026 SOXAI 検証 — 8クラス固定（DB の class_id と一致させる）
 */

export const YOGA_FEST_2026_SOXAI_CLASS_IDS = [
  "yf26-1010-0930-e",
  "yf26-1010-1330-b",
  "yf26-1010-1730-e",
  "yf26-1011-1130-c",
  "yf26-1011-1700-a",
  "yf26-1012-0930-b",
  "yf26-1012-1500-d",
  "yf26-1012-1530-e",
] as const;

export type YogaFest2026SoxaiClassId =
  (typeof YOGA_FEST_2026_SOXAI_CLASS_IDS)[number];

export type YogaFest2026SoxaiClass = {
  id: YogaFest2026SoxaiClassId;
  teacherName: string;
  classTitle: string;
  /** ISO 8601（日本時間 +09:00） */
  startsAt: string;
  endsAt: string;
  room: string;
};

export const YOGA_FEST_2026_SOXAI_CLASSES: readonly YogaFest2026SoxaiClass[] = [
  {
    id: "yf26-1010-0930-e",
    teacherName: "高橋みづき",
    classTitle: "癒しのゆったりフローヨガ",
    startsAt: "2026-10-10T09:30:00+09:00",
    endsAt: "2026-10-10T11:00:00+09:00",
    room: "Room E",
  },
  {
    id: "yf26-1010-1330-b",
    teacherName: "若林貴久（TAKA）",
    classTitle: "メラトニンヨガ™ 〜深い眠りで、もっと輝くわたしへ〜",
    startsAt: "2026-10-10T13:30:00+09:00",
    endsAt: "2026-10-10T15:00:00+09:00",
    room: "Room B",
  },
  {
    id: "yf26-1010-1730-e",
    teacherName: "谷上和子",
    classTitle: "感覚に気づくヨガニドラ",
    startsAt: "2026-10-10T17:30:00+09:00",
    endsAt: "2026-10-10T19:00:00+09:00",
    room: "Room E",
  },
  {
    id: "yf26-1011-1130-c",
    teacherName: "山内葵",
    classTitle: "『絵本×ヨガ』〜じぶんと繋がり可能性広がる〜",
    startsAt: "2026-10-11T11:30:00+09:00",
    endsAt: "2026-10-11T13:00:00+09:00",
    room: "Room C",
  },
  {
    id: "yf26-1011-1700-a",
    teacherName: "浅野佑介",
    classTitle:
      "動けば変わり、やる気が出て活力が湧く！『インナーシェイプヨガ』ヨガフェスタver.",
    startsAt: "2026-10-11T17:00:00+09:00",
    endsAt: "2026-10-11T18:30:00+09:00",
    room: "Room A",
  },
  {
    id: "yf26-1012-0930-b",
    teacherName: "Kaoru",
    classTitle: "肋骨×骨盤 〜くびれと姿勢をつくる90分〜",
    startsAt: "2026-10-12T09:30:00+09:00",
    endsAt: "2026-10-12T11:00:00+09:00",
    room: "Room B",
  },
  {
    id: "yf26-1012-1500-d",
    teacherName: "若林貴久（TAKA）",
    classTitle: "CHAKRA SOUND BATH 〜音の波にとける、7つのチャクラ瞑想〜",
    startsAt: "2026-10-12T15:00:00+09:00",
    endsAt: "2026-10-12T16:30:00+09:00",
    room: "Room D",
  },
  {
    id: "yf26-1012-1530-e",
    teacherName: "神澤夏子",
    classTitle: "Gentle Flow 〜わたしのために過ごす90分〜",
    startsAt: "2026-10-12T15:30:00+09:00",
    endsAt: "2026-10-12T17:00:00+09:00",
    room: "Room E",
  },
] as const;

const classById = new Map(
  YOGA_FEST_2026_SOXAI_CLASSES.map((item) => [item.id, item]),
);

export function isYogaFest2026SoxaiClassId(
  value: string,
): value is YogaFest2026SoxaiClassId {
  return (YOGA_FEST_2026_SOXAI_CLASS_IDS as readonly string[]).includes(value);
}

export function getYogaFest2026SoxaiClass(
  id: YogaFest2026SoxaiClassId,
): YogaFest2026SoxaiClass {
  const found = classById.get(id);
  if (!found) {
    throw new Error(`Unknown class id: ${id}`);
  }
  return found;
}
