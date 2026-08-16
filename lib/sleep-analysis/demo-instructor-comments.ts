/**
 * デモ版インストラクターコメント欄。
 * ブラウザ保存。将来 DB 移行しやすいフラット型。
 */

export type DemoInstructorComments = {
  todayEvaluation: string;
  explanationToday: string;
  dayYogaGuidance: string;
  nightYogaGuidance: string;
  homeworkUntilNext: string;
  nextCheckItems: string;
};

export const EMPTY_DEMO_INSTRUCTOR_COMMENTS: DemoInstructorComments = {
  todayEvaluation: "",
  explanationToday: "",
  dayYogaGuidance: "",
  nightYogaGuidance: "",
  homeworkUntilNext: "",
  nextCheckItems: "",
};

export const DEMO_INSTRUCTOR_COMMENT_FIELDS: Array<{
  key: keyof DemoInstructorComments;
  label: string;
  placeholder: string;
}> = [
  {
    key: "todayEvaluation",
    label: "今日の評価",
    placeholder: "例：睡眠効率に改善余地。回復の土台はある。",
  },
  {
    key: "explanationToday",
    label: "今回の説明内容",
    placeholder: "例：24時間の流れで昼と夜をつなげて説明した。",
  },
  {
    key: "dayYogaGuidance",
    label: "昼の間のヨガ™の指導内容",
    placeholder: "例：午後の切り替えとして短時間実施を案内。",
  },
  {
    key: "nightYogaGuidance",
    label: "夜のメラトニンヨガ™の指導内容",
    placeholder: "例：就寝前に刺激を増やさず穏やかに整えるよう案内。",
  },
  {
    key: "homeworkUntilNext",
    label: "次回までの課題",
    placeholder: "例：朝の光／就寝前の実践／入浴時間の安定",
  },
  {
    key: "nextCheckItems",
    label: "次回確認する項目",
    placeholder: "例：途中覚醒の体感／実践の継続／日中のだるさ",
  },
];

const STORAGE_PREFIX = "swij-swr-demo-instructor-comments-v1:";

export function readDemoInstructorComments(
  storageKey: string,
): DemoInstructorComments {
  const key = `${STORAGE_PREFIX}${storageKey}`;
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (!raw) return { ...EMPTY_DEMO_INSTRUCTOR_COMMENTS };
    const parsed = JSON.parse(raw) as Partial<DemoInstructorComments>;
    return {
      todayEvaluation: String(parsed.todayEvaluation ?? ""),
      explanationToday: String(parsed.explanationToday ?? ""),
      dayYogaGuidance: String(parsed.dayYogaGuidance ?? ""),
      nightYogaGuidance: String(parsed.nightYogaGuidance ?? ""),
      homeworkUntilNext: String(parsed.homeworkUntilNext ?? ""),
      nextCheckItems: String(parsed.nextCheckItems ?? ""),
    };
  } catch {
    return { ...EMPTY_DEMO_INSTRUCTOR_COMMENTS };
  }
}

export function writeDemoInstructorComments(
  storageKey: string,
  notes: DemoInstructorComments,
): void {
  const key = `${STORAGE_PREFIX}${storageKey}`;
  const payload = JSON.stringify(notes);
  try {
    sessionStorage.setItem(key, payload);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(key, payload);
  } catch {
    /* ignore */
  }
}
