import { ACADEMY_LESSONS, ACADEMY_QUALIFICATIONS, getTest } from "@/lib/academy/catalog";
import {
  addMonthsIso,
  generateCertificateNumber,
  scoreTestAttempt,
  todayInTokyo,
} from "@/lib/academy/scoring";
import type {
  AcademyCredential,
  AcademyLessonProgress,
  AcademyLessonStatus,
  AcademyQualificationId,
  AcademyTestAttempt,
} from "@/lib/academy/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LOCAL_STORAGE_KEY = "swij-academy-v1";

type LocalStore = {
  credentials: AcademyCredential[];
  progress: AcademyLessonProgress[];
  attempts: AcademyTestAttempt[];
};

type SupabaseAuth = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>;
  userId: string;
};

type DbCredentialRow = {
  id: string;
  user_id: string;
  qualification_id: string;
  acquired_at: string;
  expires_at: string;
  renewed_at: string | null;
  certificate_number: string;
  issued_at: string;
  created_at: string;
  updated_at: string;
};

type DbProgressRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

type DbAttemptRow = {
  id: string;
  user_id: string;
  test_id: string;
  score: number;
  max_score: number;
  passed: boolean;
  answers: Record<string, string | number>;
  submitted_at: string;
};

async function getSupabaseAuth(): Promise<SupabaseAuth | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createBrowserClient();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, userId: user.id };
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `acd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyStore(): LocalStore {
  return { credentials: [], progress: [], attempts: [] };
}

function readLocal(userId: string): LocalStore {
  if (!canUseLocalStorage()) return emptyStore();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const seeded = seedDemoStore(userId);
      writeLocal(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as LocalStore;
    return {
      credentials: Array.isArray(parsed.credentials) ? parsed.credentials : [],
      progress: Array.isArray(parsed.progress) ? parsed.progress : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeLocal(store: LocalStore): void {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
}

function seedDemoStore(userId: string): LocalStore {
  const today = todayInTokyo();
  const now = new Date().toISOString();
  const credentials: AcademyCredential[] = [
    {
      id: createId(),
      userId,
      qualificationId: "navigator",
      acquiredAt: "2025-04-01",
      expiresAt: addMonthsIso("2025-04-01", 24),
      renewedAt: null,
      certificateNumber: "SWIJ-2025-NAV1",
      issuedAt: "2025-04-01T00:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      userId,
      qualificationId: "melatonin_yoga_instructor",
      acquiredAt: "2025-09-15",
      expiresAt: addMonthsIso("2025-09-15", 24),
      renewedAt: today,
      certificateNumber: "SWIJ-2025-MYI2",
      issuedAt: "2025-09-15T00:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const progress: AcademyLessonProgress[] = ACADEMY_LESSONS.slice(0, 6).map(
    (lesson, index) => {
      const status: AcademyLessonStatus =
        index < 3 ? "completed" : index < 5 ? "in_progress" : "not_started";
      return {
        id: createId(),
        userId,
        lessonId: lesson.id,
        status,
        startedAt: status === "not_started" ? null : now,
        completedAt: status === "completed" ? now : null,
        updatedAt: now,
      };
    },
  );

  return { credentials, progress, attempts: [] };
}

function mapCredential(row: DbCredentialRow): AcademyCredential {
  return {
    id: row.id,
    userId: row.user_id,
    qualificationId: row.qualification_id as AcademyQualificationId,
    acquiredAt: row.acquired_at,
    expiresAt: row.expires_at,
    renewedAt: row.renewed_at,
    certificateNumber: row.certificate_number,
    issuedAt: row.issued_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProgress(row: DbProgressRow): AcademyLessonProgress {
  return {
    id: row.id,
    userId: row.user_id,
    lessonId: row.lesson_id,
    status: row.status as AcademyLessonStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function mapAttempt(row: DbAttemptRow): AcademyTestAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    testId: row.test_id,
    score: row.score,
    maxScore: row.max_score,
    passed: row.passed,
    answers: row.answers ?? {},
    submittedAt: row.submitted_at,
  };
}

export type AcademyDashboardData = {
  credentials: AcademyCredential[];
  progress: AcademyLessonProgress[];
  attempts: AcademyTestAttempt[];
  overallPercent: number;
  displayName: string;
};

export function computeOverallPercent(
  progress: AcademyLessonProgress[],
): number {
  const total = ACADEMY_LESSONS.length;
  if (total === 0) return 0;
  const completed = ACADEMY_LESSONS.filter((lesson) => {
    const row = progress.find((p) => p.lessonId === lesson.id);
    return row?.status === "completed";
  }).length;
  return Math.round((completed / total) * 100);
}

export function resolveLessonStatus(
  progress: AcademyLessonProgress[],
  lessonId: string,
): AcademyLessonStatus {
  return (
    progress.find((p) => p.lessonId === lessonId)?.status ?? "not_started"
  );
}

export async function loadAcademyDashboard(): Promise<AcademyDashboardData> {
  const auth = await getSupabaseAuth();
  const displayName = "認定講師";

  if (!auth) {
    const userId = "local-demo";
    const store = readLocal(userId);
    return {
      credentials: store.credentials.filter((c) => c.userId === userId),
      progress: store.progress.filter((p) => p.userId === userId),
      attempts: store.attempts.filter((a) => a.userId === userId),
      overallPercent: computeOverallPercent(store.progress),
      displayName,
    };
  }

  const { supabase, userId } = auth;

  const [credRes, progRes, attemptRes, profileRes] = await Promise.all([
    supabase
      .from("academy_credentials")
      .select("*")
      .eq("user_id", userId)
      .order("acquired_at", { ascending: false }),
    supabase.from("academy_lesson_progress").select("*").eq("user_id", userId),
    supabase
      .from("academy_test_attempts")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (credRes.error || progRes.error || attemptRes.error) {
    // テーブル未適用時はローカルへフォールバック
    const store = readLocal(userId);
    return {
      credentials: store.credentials.filter((c) => c.userId === userId),
      progress: store.progress.filter((p) => p.userId === userId),
      attempts: store.attempts.filter((a) => a.userId === userId),
      overallPercent: computeOverallPercent(store.progress),
      displayName:
        (profileRes.data as { display_name?: string | null } | null)
          ?.display_name ?? displayName,
    };
  }

  const credentials = ((credRes.data ?? []) as DbCredentialRow[]).map(
    mapCredential,
  );
  const progress = ((progRes.data ?? []) as DbProgressRow[]).map(mapProgress);
  const attempts = ((attemptRes.data ?? []) as DbAttemptRow[]).map(mapAttempt);

  return {
    credentials,
    progress,
    attempts,
    overallPercent: computeOverallPercent(progress),
    displayName:
      (profileRes.data as { display_name?: string | null } | null)
        ?.display_name ?? displayName,
  };
}

export async function upsertLessonStatus(
  lessonId: string,
  status: AcademyLessonStatus,
): Promise<AcademyLessonProgress> {
  const now = new Date().toISOString();
  const auth = await getSupabaseAuth();
  const userId = auth?.userId ?? "local-demo";

  const payload = {
    user_id: userId,
    lesson_id: lessonId,
    status,
    started_at:
      status === "not_started" ? null : now,
    completed_at: status === "completed" ? now : null,
    updated_at: now,
  };

  if (auth) {
    const { data, error } = await auth.supabase
      .from("academy_lesson_progress")
      .upsert(payload, { onConflict: "user_id,lesson_id" })
      .select("*")
      .single();

    if (!error && data) {
      return mapProgress(data as DbProgressRow);
    }
  }

  const store = readLocal(userId);
  const existing = store.progress.find(
    (p) => p.userId === userId && p.lessonId === lessonId,
  );
  const row: AcademyLessonProgress = {
    id: existing?.id ?? createId(),
    userId,
    lessonId,
    status,
    startedAt: status === "not_started" ? null : existing?.startedAt ?? now,
    completedAt: status === "completed" ? now : null,
    updatedAt: now,
  };
  store.progress = [
    ...store.progress.filter(
      (p) => !(p.userId === userId && p.lessonId === lessonId),
    ),
    row,
  ];
  writeLocal(store);
  return row;
}

export async function submitAcademyTest(
  testId: string,
  answers: Record<string, string | number>,
): Promise<{ attempt: AcademyTestAttempt; credential: AcademyCredential | null }> {
  const test = getTest(testId);
  if (!test) {
    throw new Error("テストが見つかりません");
  }

  const scored = scoreTestAttempt(test, answers);
  const now = new Date().toISOString();
  const auth = await getSupabaseAuth();
  const userId = auth?.userId ?? "local-demo";

  const attempt: AcademyTestAttempt = {
    id: createId(),
    userId,
    testId,
    score: scored.score,
    maxScore: scored.maxScore,
    passed: scored.passed,
    answers,
    submittedAt: now,
  };

  let credential: AcademyCredential | null = null;

  if (scored.passed) {
    const qualification = ACADEMY_QUALIFICATIONS.find(
      (q) => q.id === test.qualificationId,
    );
    const acquiredAt = todayInTokyo();
    const expiresAt = addMonthsIso(
      acquiredAt,
      qualification?.validityMonths ?? 24,
    );
    credential = {
      id: createId(),
      userId,
      qualificationId: test.qualificationId,
      acquiredAt,
      expiresAt,
      renewedAt: acquiredAt,
      certificateNumber: generateCertificateNumber(),
      issuedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (auth) {
    const { data: attemptRow, error: attemptError } = await auth.supabase
      .from("academy_test_attempts")
      .insert({
        id: attempt.id,
        user_id: userId,
        test_id: testId,
        score: attempt.score,
        max_score: attempt.maxScore,
        passed: attempt.passed,
        answers,
        submitted_at: now,
      })
      .select("*")
      .single();

    if (!attemptError && attemptRow) {
      attempt.id = (attemptRow as DbAttemptRow).id;
    }

    if (credential) {
      const { data: credRow, error: credError } = await auth.supabase
        .from("academy_credentials")
        .upsert(
          {
            user_id: userId,
            qualification_id: credential.qualificationId,
            acquired_at: credential.acquiredAt,
            expires_at: credential.expiresAt,
            renewed_at: credential.renewedAt,
            certificate_number: credential.certificateNumber,
            issued_at: credential.issuedAt,
          },
          { onConflict: "user_id,qualification_id" },
        )
        .select("*")
        .single();

      if (!credError && credRow) {
        credential = mapCredential(credRow as DbCredentialRow);
      } else if (credError) {
        // unique certificate collision など — ローカルへ
        credential = null;
      }
    }

    if (!attemptError) {
      return { attempt, credential };
    }
  }

  const store = readLocal(userId);
  store.attempts = [attempt, ...store.attempts];
  if (credential) {
    store.credentials = [
      ...store.credentials.filter(
        (c) =>
          !(
            c.userId === userId &&
            c.qualificationId === credential!.qualificationId
          ),
      ),
      credential,
    ];
  }
  writeLocal(store);
  return { attempt, credential };
}

export async function getCredentialById(
  credentialId: string,
): Promise<AcademyCredential | null> {
  const data = await loadAcademyDashboard();
  return data.credentials.find((c) => c.id === credentialId) ?? null;
}
