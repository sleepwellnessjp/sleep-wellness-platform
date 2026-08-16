import type { Database } from "@/lib/supabase/database.types";
import {
  CERTIFIED_INSTRUCTOR_TITLE,
  type InstructorProfileEditable,
  type InstructorPublicCard,
  type InstructorPublicDetail,
} from "@/lib/instructors/types";

export type CertifiedInstructorRow =
  Database["public"]["Tables"]["certified_instructors"]["Row"];

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function activityNameOf(row: CertifiedInstructorRow): string {
  const rowAny = row as CertifiedInstructorRow & {
    public_name?: string | null;
  };
  const publicName = (rowAny.public_name ?? "").trim();
  if (publicName) return publicName;
  const legacyPublic = (row.public_display_name ?? "").trim();
  if (legacyPublic) return legacyPublic;
  return (row.display_name ?? "").trim() || "認定講師";
}

export function certificationLabelOf(levelId: string | null | undefined): string {
  // 公開面では資格名を正確に「メラトニンヨガ™認定講師」と表示
  void levelId;
  return CERTIFIED_INSTRUCTOR_TITLE;
}

export function toPublicCard(row: CertifiedInstructorRow): InstructorPublicCard {
  const showLegal = Boolean(row.show_legal_name);
  const legal = (row.legal_name ?? "").trim();
  return {
    id: row.id,
    activityName: activityNameOf(row),
    legalName: showLegal && legal ? legal : null,
    certificationLabel: certificationLabelOf(row.level_id),
    headline: (row.headline ?? "").trim(),
    bio: (row.bio ?? "").trim(),
    activityArea: (row.activity_area ?? "").trim(),
    onlineAvailable: Boolean(row.online_available),
    yogaSpecialties: asStringArray(row.yoga_specialties),
    pilatesSpecialties: asStringArray(row.pilates_specialties),
    specialties: asStringArray(row.specialties),
    profileImageUrl: row.profile_image_url?.trim() || null,
    instagramUrl: (row.instagram_url ?? "").trim(),
    websiteUrl: (row.website_url ?? "").trim(),
    contactEmail: (row.contact_email ?? "").trim(),
    levelId: row.level_id,
  };
}

export function toPublicDetail(row: CertifiedInstructorRow): InstructorPublicDetail {
  return {
    ...toPublicCard(row),
    career: (row.career ?? "").trim(),
    serviceArea: (row.service_area ?? "").trim(),
    availablePrograms: asStringArray(row.available_programs),
  };
}

export function toEditableProfile(
  row: CertifiedInstructorRow,
): InstructorProfileEditable {
  return {
    id: row.id,
    userId: row.user_id,
    profileImageUrl: row.profile_image_url?.trim() || null,
    publicDisplayName: row.public_display_name ?? "",
    legalName: row.legal_name ?? "",
    showLegalName: Boolean(row.show_legal_name),
    headline: row.headline ?? "",
    bio: row.bio ?? "",
    career: row.career ?? "",
    activityArea: row.activity_area ?? "",
    serviceArea: row.service_area ?? "",
    onlineAvailable: Boolean(row.online_available),
    yogaSpecialties: asStringArray(row.yoga_specialties),
    pilatesSpecialties: asStringArray(row.pilates_specialties),
    specialties: asStringArray(row.specialties),
    availablePrograms: asStringArray(row.available_programs),
    instagramUrl: row.instagram_url ?? "",
    websiteUrl: row.website_url ?? "",
    contactEmail: row.contact_email ?? "",
    isPublic: Boolean(row.is_public),
    recommendationNote: row.recommendation_note ?? "",
    displayOrder: row.display_order ?? 1000,
    profileUpdatedAt: row.profile_updated_at,
    displayName: row.display_name ?? "",
    levelId: row.level_id,
    certificationLabel: certificationLabelOf(row.level_id),
    status: row.status,
  };
}

export function matchesDirectoryFilters(
  card: InstructorPublicCard,
  filters: {
    query?: string;
    activityArea?: string;
    onlineOnly?: boolean;
    yoga?: boolean;
    matPilates?: boolean;
    machinePilates?: boolean;
    melatoninYoga?: boolean;
    sleepWellnessCert?: boolean;
  },
): boolean {
  const q = (filters.query ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (q) {
    const haystack = [
      card.activityName,
      card.legalName ?? "",
      card.activityArea,
      card.bio,
      card.headline,
      ...card.yogaSpecialties,
      ...card.pilatesSpecialties,
      ...card.specialties,
    ]
      .join("")
      .toLowerCase()
      .replace(/\s+/g, "");
    if (!haystack.includes(q)) return false;
  }

  const area = (filters.activityArea ?? "").trim().toLowerCase();
  if (area && !card.activityArea.toLowerCase().includes(area)) return false;

  if (filters.onlineOnly && !card.onlineAvailable) return false;

  if (filters.yoga) {
    const hasYoga =
      card.yogaSpecialties.length > 0 ||
      card.specialties.some((s) => /ヨガ|yoga/i.test(s));
    if (!hasYoga) return false;
  }

  if (filters.matPilates) {
    const hit = card.pilatesSpecialties.some((s) =>
      /マット|mat/i.test(s),
    );
    if (!hit) return false;
  }

  if (filters.machinePilates) {
    const hit = card.pilatesSpecialties.some((s) =>
      /マシン|machine|reformer/i.test(s),
    );
    if (!hit) return false;
  }

  if (filters.melatoninYoga) {
    // 公開一覧はメラトニンヨガ™認定講師のみ → フィルターONでも全件該当
  }

  if (filters.sleepWellnessCert) {
    // Sleep Wellness 関連資格を持つ認定講師一覧のため全件該当
  }

  return true;
}
