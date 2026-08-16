/**
 * インストラクターセッション記録。
 * 現段階はブラウザ保存。将来 DB 移行しやすいフラット型。
 */

export type InstructorSessionNotes = {
  /** クライアントの主観 */
  clientSubjective: string;
  /** 生活背景 */
  lifestyleContext: string;
  /** 今回の指導内容 */
  guidanceToday: string;
  /** 次回までの課題 */
  homeworkUntilNext: string;
  /** 次回確認項目 */
  nextCheckItems: string;
};

export const EMPTY_INSTRUCTOR_SESSION_NOTES: InstructorSessionNotes = {
  clientSubjective: "",
  lifestyleContext: "",
  guidanceToday: "",
  homeworkUntilNext: "",
  nextCheckItems: "",
};

export const INSTRUCTOR_SESSION_NOTE_FIELDS: Array<{
  key: keyof InstructorSessionNotes;
  label: string;
  placeholder: string;
}> = [
  {
    key: "clientSubjective",
    label: "クライアントの主観",
    placeholder: "例：昨夜は途中で目が覚めやすかった。日中のだるさが気になる。",
  },
  {
    key: "lifestyleContext",
    label: "生活背景",
    placeholder: "例：残業続き／就寝前の飲酒あり／入浴はシャワーのみ",
  },
  {
    key: "guidanceToday",
    label: "今回の指導内容",
    placeholder: "例：起床固定と眠気が出てからの就床を優先して案内",
  },
  {
    key: "homeworkUntilNext",
    label: "次回までの課題",
    placeholder: "例：就寝90分前の入浴を週4回試す／スクリーン終了時刻を決める",
  },
  {
    key: "nextCheckItems",
    label: "次回確認項目",
    placeholder: "例：睡眠効率の変化／途中覚醒の主観／HRVの戻り",
  },
];

const STORAGE_PREFIX = "swij-swr-instructor-session-notes-v1:";

export function instructorSessionNotesStorageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

export function readInstructorSessionNotes(
  storageKey: string,
): InstructorSessionNotes {
  const key = instructorSessionNotesStorageKey(storageKey);
  try {
    const raw =
      sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (!raw) return { ...EMPTY_INSTRUCTOR_SESSION_NOTES };
    const parsed = JSON.parse(raw) as Partial<InstructorSessionNotes>;
    return {
      clientSubjective: String(parsed.clientSubjective ?? ""),
      lifestyleContext: String(parsed.lifestyleContext ?? ""),
      guidanceToday: String(parsed.guidanceToday ?? ""),
      homeworkUntilNext: String(parsed.homeworkUntilNext ?? ""),
      nextCheckItems: String(parsed.nextCheckItems ?? ""),
    };
  } catch {
    return { ...EMPTY_INSTRUCTOR_SESSION_NOTES };
  }
}

export function writeInstructorSessionNotes(
  storageKey: string,
  notes: InstructorSessionNotes,
): void {
  const key = instructorSessionNotesStorageKey(storageKey);
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
