/** Sleep Wellness Academy domain types (V1.0). */

export type AcademyQualificationId =
  | "navigator"
  | "melatonin_yoga_instructor"
  | "sleep_wellness_producer";

export type AcademyContentCategory =
  | "sleep_science"
  | "melatonin_yoga"
  | "japanese_ma"
  | "breathing"
  | "soxai"
  | "case_study";

export type AcademyContentType = "video" | "pdf" | "material";

export type AcademyLessonStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export type AcademyQuestionKind = "multiple_choice" | "written";

export type AcademyQualification = {
  id: AcademyQualificationId;
  name: string;
  shortName: string;
  description: string;
  validityMonths: number;
};

export type AcademyLesson = {
  id: string;
  category: AcademyContentCategory;
  title: string;
  summary: string;
  contentType: AcademyContentType;
  durationLabel: string;
  qualificationId: AcademyQualificationId;
};

export type AcademyQuestion = {
  id: string;
  kind: AcademyQuestionKind;
  prompt: string;
  /** multiple_choice のみ */
  choices?: string[];
  /** multiple_choice の正解 index。written は採点用キーワード */
  correctIndex?: number;
  keywords?: string[];
  points: number;
};

export type AcademyTest = {
  id: string;
  qualificationId: AcademyQualificationId;
  title: string;
  description: string;
  passingScore: number;
  questions: AcademyQuestion[];
};

export type AcademyCredential = {
  id: string;
  userId: string;
  qualificationId: AcademyQualificationId;
  acquiredAt: string;
  expiresAt: string;
  renewedAt: string | null;
  certificateNumber: string;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AcademyLessonProgress = {
  id: string;
  userId: string;
  lessonId: string;
  status: AcademyLessonStatus;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type AcademyTestAttempt = {
  id: string;
  userId: string;
  testId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  answers: Record<string, string | number>;
  submittedAt: string;
};
