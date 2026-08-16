import {
  CERTIFIED_INSTRUCTOR_TITLE,
  type InstructorPublicCard,
  type InstructorPublicDetail,
} from "@/lib/instructors/types";

/**
 * Sleep Wellness Institute Japan 認定のメラトニンヨガ™認定講師（公開名簿）。
 * 未登録の写真・プロフィール・活動地域などは入れない（氏名のみ）。
 * 本人提供の写真がある講師のみ profileImageUrl を設定する。
 */
const ROSTER_NAMES = [
  "若林貴久",
  "若林香織",
  "鏑木雄太",
  "蓬田しのぶ",
  "矢田朝美",
  "加地史佳",
  "中島里佳",
] as const;

function slugifyName(name: string): string {
  const map: Record<string, string> = {
    若林貴久: "wakabayashi-takahisa",
    若林香織: "wakabayashi-kaori",
    鏑木雄太: "kaburagi-yuta",
    蓬田しのぶ: "yomogida-shinobu",
    矢田朝美: "yata-asami",
    加地史佳: "kaji-fumika",
    中島里佳: "nakajima-rika",
  };
  return map[name] ?? name;
}

const TAKAHISA_HEADLINE =
  "睡眠ウェルネスプロデューサー／メラトニンヨガ™考案者\nSleep Wellness Institute Japan 代表";

const TAKAHISA_BIO = `ヨガ・ピラティス指導者として、心と身体を整えることを長年伝える中で、「運動」だけではなく、その先にある睡眠と休息の質の重要性に着目。

ヨガ、呼吸、瞑想、サウンド、入浴、食、そしてウェアラブルデバイスによる睡眠データなどを組み合わせ、日常の中から睡眠とウェルネスを整えていくSleep Wellness Method™を構築。夜の休息に特化した独自プログラム「メラトニンヨガ™」を考案し、指導者の育成にも取り組んでいる。

ヨガ指導資格はE-RYT500／YACEP。ヨガ・ピラティス指導のほか、指導者養成、企業・自治体とのウェルネスイベント、講演、プログラム監修など幅広く活動。

アジア最大級のヨガイベント「ヨガフェスタ横浜」に毎年登壇。世界的ウェルネスイベントWorld Wellness Weekendでは日本アンバサダーとして活動し、フランス本部より4年連続でアワードを受賞。

また、世界的ヨガブランドMandukaが選出するアンバサダーの一人として活動するほか、新聞、ヨガ・ピラティス・フィットネス専門誌など多数のメディアに掲載。

著書に『かんたんお風呂ヨガ』。

現在は、ヨガを教えることだけにとどまらず、「睡眠を、人生の土台へ。」をテーマに、睡眠・運動・休息をつなぐ新しいウェルネスのあり方を社会へ広げる活動を行っている。`;

function toCard(name: (typeof ROSTER_NAMES)[number]): InstructorPublicCard {
  const base: InstructorPublicCard = {
    id: `roster-${slugifyName(name)}`,
    activityName: name,
    legalName: null,
    certificationLabel: CERTIFIED_INSTRUCTOR_TITLE,
    headline: "",
    bio: "",
    activityArea: "",
    onlineAvailable: false,
    yogaSpecialties: [],
    pilatesSpecialties: [],
    specialties: [],
    profileImageUrl: null,
    instagramUrl: "",
    websiteUrl: "",
    contactEmail: "",
    levelId: "certified",
  };

  const photoByName: Partial<Record<(typeof ROSTER_NAMES)[number], string>> = {
    若林貴久: "/instructors/wakabayashi-takahisa-v2.jpg",
    若林香織: "/instructors/wakabayashi-kaori.jpg",
    加地史佳: "/instructors/kaji-fumika.jpg",
    矢田朝美: "/instructors/yata-asami.jpg",
  };

  if (name === "若林貴久") {
    return {
      ...base,
      headline: TAKAHISA_HEADLINE,
      bio: TAKAHISA_BIO,
      profileImageUrl: photoByName[name] ?? null,
    };
  }

  const photo = photoByName[name];
  if (photo) {
    return { ...base, profileImageUrl: photo };
  }

  return base;
}

/** 公開ディレクトリ用の認定講師名簿（表示順固定） */
export const CERTIFIED_INSTRUCTOR_ROSTER: InstructorPublicCard[] =
  ROSTER_NAMES.map((name) => toCard(name));

export function isRosterInstructorId(id: string): boolean {
  return id.startsWith("roster-");
}

export function getRosterInstructor(id: string): InstructorPublicDetail | null {
  const card = CERTIFIED_INSTRUCTOR_ROSTER.find((item) => item.id === id);
  if (!card) return null;
  return {
    ...card,
    career: "",
    serviceArea: "",
    availablePrograms: [],
  };
}

/**
 * DB の公開講師と名簿を統合する。
 * 公開名簿の7名は名簿側を優先（表示順・本人提供プロフィールを維持）。
 * 名簿外の DB 公開講師は末尾に追加。
 */
export function mergePublicInstructorsWithRoster(
  fromDb: InstructorPublicCard[],
): InstructorPublicCard[] {
  const normalize = (name: string) => name.replace(/\s+/g, "");
  const rosterKeys = new Set(
    CERTIFIED_INSTRUCTOR_ROSTER.map((card) => normalize(card.activityName)),
  );

  const merged: InstructorPublicCard[] = [...CERTIFIED_INSTRUCTOR_ROSTER];
  const used = new Set(rosterKeys);

  for (const card of fromDb) {
    const key = normalize(card.activityName);
    if (!used.has(key)) {
      merged.push(card);
      used.add(key);
    }
  }

  return merged;
}
