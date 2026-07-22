import {
  CERTIFICATION_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  currentYearMonth,
  yearMonthStartIso,
} from "@/lib/platform/constants";
import {
  getCurrentProfile,
  listAdminLogs,
  listInstructorSummaries,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import type {
  CertificationType,
  MembershipStatus,
} from "@/lib/platform/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type {
  ActivityLogCategory,
  AdminAcademyCredentialRow,
  AdminAcademyOverview,
  AdminAnalyticsOverview,
  AdminClientRow,
  AdminDashboardStats,
  AdminInstructorRow,
  AdminLogBundle,
  MonthlyAnalysisPoint,
  PlatformSettingsRecord,
  SystemActivityLogRecord,
} from "./types";

const ACTIVE_WINDOW_DAYS = 45;
const RENEWAL_WINDOW_DAYS = 90;

function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(from.getTime())) return 0;
  const today = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86_400_000));
}

function daysUntil(dateIso: string): number | null {
  const target = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.floor((end.getTime() - today.getTime()) / 86_400_000);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function yearMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}/${Number(m)}`;
}

function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function mapSettings(row: Record<string, unknown>): PlatformSettingsRecord {
  return {
    id: String(row.id ?? "default"),
    brandPrimary: String(row.brand_primary ?? "#071426"),
    brandAccent: String(row.brand_accent ?? "#8a6a2d"),
    logoUrl: String(row.logo_url ?? "/swij-logo-horizontal.png"),
    termsOfService: String(row.terms_of_service ?? ""),
    privacyPolicy: String(row.privacy_policy ?? ""),
    contactEmail: String(row.contact_email ?? ""),
    contactPhone: String(row.contact_phone ?? ""),
    contactNote: String(row.contact_note ?? ""),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function defaultSettings(): PlatformSettingsRecord {
  return {
    id: "default",
    brandPrimary: "#071426",
    brandAccent: "#8a6a2d",
    logoUrl: "/swij-logo-horizontal.png",
    termsOfService: "",
    privacyPolicy: "",
    contactEmail: "contact@sleepwellness.jp",
    contactPhone: "",
    contactNote: "",
    updatedAt: new Date().toISOString(),
  };
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const ym = currentYearMonth();
  const monthStart = yearMonthStartIso(ym);

  const [
    instructors,
    clientsCount,
    totalAnalyses,
    monthAnalyses,
    scoreRows,
    newClients,
    clientRows,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "instructor"),
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("analyses").select("id", { count: "exact", head: true }),
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("analyses")
      .select("sleep_score")
      .not("sleep_score", "is", null)
      .limit(5000),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase.from("clients").select("id, created_at, registered_at"),
  ]);

  const scores = (scoreRows.data ?? [])
    .map((row) => Number((row as { sleep_score: number | null }).sleep_score))
    .filter((n) => Number.isFinite(n));

  const averageSleepScore =
    scores.length > 0
      ? round1(scores.reduce((sum, n) => sum + n, 0) / scores.length)
      : null;

  // 継続率: 登録から45日以上経過し、直近45日以内に分析がある割合
  const clientIds = (clientRows.data ?? []).map(
    (row) => (row as { id: string }).id,
  );
  let retentionRate: number | null = null;
  if (clientIds.length > 0) {
    const { data: latestAnalyses } = await supabase
      .from("analyses")
      .select("client_id, analyzed_at, created_at")
      .in("client_id", clientIds.slice(0, 2000))
      .order("analyzed_at", { ascending: false });

    const latestByClient = new Map<string, string>();
    for (const row of latestAnalyses ?? []) {
      const r = row as {
        client_id: string;
        analyzed_at: string;
        created_at: string;
      };
      if (!latestByClient.has(r.client_id)) {
        latestByClient.set(r.client_id, r.analyzed_at || r.created_at);
      }
    }

    let eligible = 0;
    let retained = 0;
    for (const row of clientRows.data ?? []) {
      const r = row as {
        id: string;
        created_at: string;
        registered_at: string | null;
      };
      const start = r.registered_at ?? r.created_at;
      if (daysBetween(start) < ACTIVE_WINDOW_DAYS) continue;
      eligible += 1;
      const latest = latestByClient.get(r.id);
      if (latest && daysBetween(latest) <= ACTIVE_WINDOW_DAYS) {
        retained += 1;
      }
    }
    retentionRate =
      eligible > 0 ? Math.round((retained / eligible) * 100) : null;
  }

  return {
    instructorCount: instructors.count ?? 0,
    clientCount: clientsCount.count ?? 0,
    totalAnalyses: totalAnalyses.count ?? 0,
    analysesThisMonth: monthAnalyses.count ?? 0,
    averageSleepScore,
    newRegistrationsThisMonth: newClients.count ?? 0,
    retentionRate,
  };
}

export async function listAdminInstructors(): Promise<AdminInstructorRow[]> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const summaries = await listInstructorSummaries();
  const instructorIds = summaries.map((item) => item.profile.id);

  const clientCountByInstructor = new Map<string, number>();
  const analysisCountByInstructor = new Map<string, number>();
  const lastLoginById = new Map<string, string | null>();

  if (instructorIds.length > 0) {
    const [{ data: clients }, { data: analyses }, { data: profiles }] =
      await Promise.all([
        supabase
          .from("clients")
          .select("instructor_id")
          .in("instructor_id", instructorIds),
        supabase
          .from("analyses")
          .select("owner_id")
          .in("owner_id", instructorIds),
        supabase
          .from("profiles")
          .select("id, last_login_at")
          .in("id", instructorIds),
      ]);

    for (const row of clients ?? []) {
      const id = String((row as { instructor_id: string }).instructor_id);
      clientCountByInstructor.set(
        id,
        (clientCountByInstructor.get(id) ?? 0) + 1,
      );
    }
    for (const row of analyses ?? []) {
      const id = String((row as { owner_id: string }).owner_id);
      analysisCountByInstructor.set(
        id,
        (analysisCountByInstructor.get(id) ?? 0) + 1,
      );
    }
    for (const row of profiles ?? []) {
      const r = row as { id: string; last_login_at: string | null };
      lastLoginById.set(r.id, r.last_login_at);
    }
  }

  return summaries.map((item) => {
    const cert = item.membership?.certificationType ?? null;
    const status = item.membership?.status ?? null;
    return {
      id: item.profile.id,
      displayName: item.profile.displayName,
      email: item.profile.email,
      certificationType: cert,
      certificationLabel: cert ? CERTIFICATION_LABELS[cert] : "未登録",
      clientCount: clientCountByInstructor.get(item.profile.id) ?? 0,
      analysisCount: analysisCountByInstructor.get(item.profile.id) ?? 0,
      lastLoginAt: lastLoginById.get(item.profile.id) ?? null,
      status,
      statusLabel: status ? MEMBERSHIP_STATUS_LABELS[status] : "未登録",
      remainingCredits: item.remainingCredits,
      analysesThisMonth: item.analysesThisMonth,
      adminMemo: item.membership?.adminMemo ?? "",
      expiresAt: item.membership?.expiresAt ?? null,
      createdAt: item.profile.createdAt,
    };
  });
}

export async function listAdminClients(): Promise<AdminClientRow[]> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, instructor_id, registered_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (!clients?.length) return [];

  const instructorIds = [
    ...new Set(
      clients.map((row) => String((row as { instructor_id: string }).instructor_id)),
    ),
  ];
  const clientIds = clients.map((row) => String((row as { id: string }).id));

  const [{ data: profiles }, { data: analyses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", instructorIds),
    supabase
      .from("analyses")
      .select("client_id, sleep_score, analyzed_at, created_at")
      .in("client_id", clientIds)
      .order("analyzed_at", { ascending: false }),
  ]);

  const instructorName = new Map<string, string>();
  for (const row of profiles ?? []) {
    const r = row as {
      id: string;
      display_name: string | null;
      email: string | null;
    };
    instructorName.set(r.id, r.display_name ?? r.email ?? "—");
  }

  const latestByClient = new Map<
    string,
    { score: number | null; at: string; count: number }
  >();
  for (const row of analyses ?? []) {
    const r = row as {
      client_id: string;
      sleep_score: number | null;
      analyzed_at: string;
      created_at: string;
    };
    const existing = latestByClient.get(r.client_id);
    if (!existing) {
      latestByClient.set(r.client_id, {
        score: typeof r.sleep_score === "number" ? r.sleep_score : null,
        at: r.analyzed_at || r.created_at,
        count: 1,
      });
    } else {
      existing.count += 1;
    }
  }

  return clients.map((row) => {
    const r = row as {
      id: string;
      name: string;
      instructor_id: string;
      registered_at: string | null;
      created_at: string;
    };
    const latest = latestByClient.get(r.id);
    const start = r.registered_at ?? r.created_at;
    const continuityDays = daysBetween(start);
    const daysSinceLatest = latest ? daysBetween(latest.at) : null;

    let status: AdminClientRow["status"] = "new";
    let statusLabel = "新規";
    if (continuityDays >= 14) {
      if (daysSinceLatest != null && daysSinceLatest <= ACTIVE_WINDOW_DAYS) {
        status = "active";
        statusLabel = "継続中";
      } else {
        status = "inactive";
        statusLabel = "休眠";
      }
    }

    return {
      id: r.id,
      name: r.name,
      instructorId: r.instructor_id,
      instructorName: instructorName.get(r.instructor_id) ?? "—",
      sleepWellnessScore: latest?.score ?? null,
      lastAnalysisAt: latest?.at ?? null,
      continuityDays,
      status,
      statusLabel,
      registeredAt: r.registered_at ?? r.created_at.slice(0, 10),
      analysisCount: latest?.count ?? 0,
    };
  });
}

export async function getAdminAcademyOverview(): Promise<AdminAcademyOverview> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      byQualification: [],
      totalIssued: 0,
      renewingSoon: [],
      expiryCalendar: [],
    };
  }

  const { data: credentials } = await supabase
    .from("academy_credentials")
    .select("*")
    .order("expires_at", { ascending: true })
    .limit(1000);

  const rows = (credentials ?? []) as Array<Record<string, unknown>>;
  const userIds = [...new Set(rows.map((row) => String(row.user_id)))];
  const nameById = new Map<string, { name: string; email: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);
    for (const row of profiles ?? []) {
      const r = row as {
        id: string;
        display_name: string | null;
        email: string | null;
      };
      nameById.set(r.id, {
        name: r.display_name ?? r.email ?? "—",
        email: r.email,
      });
    }
  }

  const mapped: AdminAcademyCredentialRow[] = rows.map((row) => {
    const qualificationId = String(row.qualification_id) as CertificationType;
    const expiresAt = String(row.expires_at).slice(0, 10);
    const userId = String(row.user_id);
    const profile = nameById.get(userId);
    return {
      id: String(row.id),
      userId,
      userName: profile?.name ?? "—",
      userEmail: profile?.email ?? null,
      qualificationId,
      qualificationLabel:
        CERTIFICATION_LABELS[qualificationId] ?? qualificationId,
      certificateNumber: String(row.certificate_number ?? ""),
      acquiredAt: String(row.acquired_at).slice(0, 10),
      expiresAt,
      renewedAt: row.renewed_at
        ? String(row.renewed_at).slice(0, 10)
        : null,
      daysUntilExpiry: daysUntil(expiresAt),
    };
  });

  const quals: CertificationType[] = [
    "navigator",
    "melatonin_yoga_instructor",
    "sleep_wellness_producer",
  ];

  const byQualification = quals.map((qualificationId) => {
    const subset = mapped.filter(
      (item) => item.qualificationId === qualificationId,
    );
    return {
      qualificationId,
      label: CERTIFICATION_LABELS[qualificationId],
      issuedCount: subset.length,
      renewingSoonCount: subset.filter(
        (item) =>
          item.daysUntilExpiry != null &&
          item.daysUntilExpiry >= 0 &&
          item.daysUntilExpiry <= RENEWAL_WINDOW_DAYS,
      ).length,
      expiredCount: subset.filter(
        (item) => item.daysUntilExpiry != null && item.daysUntilExpiry < 0,
      ).length,
    };
  });

  const renewingSoon = mapped
    .filter(
      (item) =>
        item.daysUntilExpiry != null &&
        item.daysUntilExpiry >= 0 &&
        item.daysUntilExpiry <= RENEWAL_WINDOW_DAYS,
    )
    .slice(0, 50);

  return {
    byQualification,
    totalIssued: mapped.length,
    renewingSoon,
    expiryCalendar: mapped.slice(0, 100),
  };
}

export async function getAdminAnalyticsOverview(): Promise<AdminAnalyticsOverview> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      monthly: [],
      averageScore: null,
      improvementRate: null,
      averageAnalysisMinutes: null,
      totalAnalyses: 0,
    };
  }

  const ym = currentYearMonth();
  const startYm = shiftYearMonth(ym, -11);
  const { data: analyses } = await supabase
    .from("analyses")
    .select(
      "id, client_id, sleep_score, sleep_duration, created_at, analyzed_at",
    )
    .gte("created_at", yearMonthStartIso(startYm))
    .order("created_at", { ascending: true })
    .limit(10000);

  const rows = (analyses ?? []) as Array<{
    id: string;
    client_id: string;
    sleep_score: number | null;
    sleep_duration: number | null;
    created_at: string;
    analyzed_at: string;
  }>;

  const monthlyMap = new Map<string, { count: number; scores: number[] }>();
  for (let i = 0; i < 12; i += 1) {
    const key = shiftYearMonth(startYm, i);
    monthlyMap.set(key, { count: 0, scores: [] });
  }

  const scores: number[] = [];
  const durations: number[] = [];
  const byClient = new Map<string, number[]>();

  for (const row of rows) {
    const key = row.created_at.slice(0, 7);
    const bucket = monthlyMap.get(key);
    if (bucket) {
      bucket.count += 1;
      if (typeof row.sleep_score === "number") {
        bucket.scores.push(row.sleep_score);
      }
    }
    if (typeof row.sleep_score === "number") {
      scores.push(row.sleep_score);
      const list = byClient.get(row.client_id) ?? [];
      list.push(row.sleep_score);
      byClient.set(row.client_id, list);
    }
    if (typeof row.sleep_duration === "number" && row.sleep_duration > 0) {
      durations.push(row.sleep_duration);
    } else {
      const created = new Date(row.created_at).getTime();
      const analyzed = new Date(row.analyzed_at).getTime();
      if (
        Number.isFinite(created) &&
        Number.isFinite(analyzed) &&
        analyzed > created
      ) {
        const minutes = (analyzed - created) / 60_000;
        if (minutes > 0 && minutes < 120) durations.push(minutes);
      }
    }
  }

  const monthly: MonthlyAnalysisPoint[] = [...monthlyMap.entries()].map(
    ([yearMonth, value]) => ({
      yearMonth,
      label: yearMonthLabel(yearMonth),
      count: value.count,
      averageScore:
        value.scores.length > 0
          ? round1(
              value.scores.reduce((sum, n) => sum + n, 0) / value.scores.length,
            )
          : null,
    }),
  );

  let improved = 0;
  let comparable = 0;
  for (const list of byClient.values()) {
    if (list.length < 2) continue;
    comparable += 1;
    if (list[list.length - 1] - list[0] >= 3) improved += 1;
  }

  return {
    monthly,
    averageScore:
      scores.length > 0
        ? round1(scores.reduce((sum, n) => sum + n, 0) / scores.length)
        : null,
    improvementRate:
      comparable > 0 ? Math.round((improved / comparable) * 100) : null,
    averageAnalysisMinutes:
      durations.length > 0
        ? round1(durations.reduce((sum, n) => sum + n, 0) / durations.length)
        : null,
    totalAnalyses: rows.length,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettingsRecord> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return defaultSettings();

  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) return defaultSettings();
  return mapSettings(data as Record<string, unknown>);
}

export async function updatePlatformSettings(
  patch: Partial<
    Omit<PlatformSettingsRecord, "id" | "updatedAt">
  >,
): Promise<PlatformSettingsRecord> {
  const profile = await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase not configured");

  const payload: Record<string, unknown> = {
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  };
  if (patch.brandPrimary !== undefined) payload.brand_primary = patch.brandPrimary;
  if (patch.brandAccent !== undefined) payload.brand_accent = patch.brandAccent;
  if (patch.logoUrl !== undefined) payload.logo_url = patch.logoUrl;
  if (patch.termsOfService !== undefined) {
    payload.terms_of_service = patch.termsOfService;
  }
  if (patch.privacyPolicy !== undefined) {
    payload.privacy_policy = patch.privacyPolicy;
  }
  if (patch.contactEmail !== undefined) payload.contact_email = patch.contactEmail;
  if (patch.contactPhone !== undefined) payload.contact_phone = patch.contactPhone;
  if (patch.contactNote !== undefined) payload.contact_note = patch.contactNote;

  const { data, error } = await supabase
    .from("platform_settings")
    .upsert({ id: "default", ...payload })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "設定の保存に失敗しました");
  }

  await supabase.from("admin_logs").insert({
    actor_id: profile.id,
    target_user_id: null,
    action: "settings_update",
    payload: payload as Json,
  });

  return mapSettings(data as Record<string, unknown>);
}

export async function listSystemActivityLogs(input?: {
  category?: ActivityLogCategory | "all";
  limit?: number;
}): Promise<SystemActivityLogRecord[]> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("system_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(input?.limit ?? 100);

  if (input?.category && input.category !== "all") {
    query = query.eq("category", input.category);
  }

  const { data } = await query;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const actorIds = [
    ...new Set(
      rows
        .map((row) => (row.actor_id ? String(row.actor_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", actorIds);
    for (const row of profiles ?? []) {
      const r = row as {
        id: string;
        display_name: string | null;
        email: string | null;
      };
      nameById.set(r.id, r.display_name ?? r.email ?? "—");
    }
  }

  return rows.map((row) => ({
    id: String(row.id),
    actorId: row.actor_id ? String(row.actor_id) : null,
    actorName: row.actor_id ? (nameById.get(String(row.actor_id)) ?? null) : null,
    category: String(row.category) as ActivityLogCategory,
    action: String(row.action ?? ""),
    targetType: row.target_type ? String(row.target_type) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    summary: String(row.summary ?? ""),
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  }));
}

export async function getAdminLogBundle(input?: {
  category?: ActivityLogCategory | "all";
}): Promise<AdminLogBundle> {
  await requireAdminProfile();
  const [activityLogs, adminLogs] = await Promise.all([
    listSystemActivityLogs({ category: input?.category, limit: 100 }),
    listAdminLogs(),
  ]);
  return { activityLogs, adminLogs };
}

export async function recordSystemActivity(input: {
  category: ActivityLogCategory;
  action: string;
  summary?: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  actorId?: string | null;
}): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;

  const profile = input.actorId
    ? null
    : await getCurrentProfile().catch(() => null);
  const actorId = input.actorId ?? profile?.id ?? null;

  await supabase.from("system_activity_logs").insert({
    actor_id: actorId,
    category: input.category,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    summary: input.summary ?? "",
    payload: (input.payload ?? {}) as Json,
  });

  if (input.category === "login" && actorId) {
    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", actorId);
  }
}

/** Membership status helper for UI filters */
export function isMembershipStatus(value: string): value is MembershipStatus {
  return (
    value === "active" ||
    value === "renewal_pending" ||
    value === "suspended" ||
    value === "expired"
  );
}
