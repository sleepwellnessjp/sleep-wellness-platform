import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getRosterInstructor,
  mergePublicInstructorsWithRoster,
} from "@/lib/instructors/certified-roster";
import {
  matchesDirectoryFilters,
  toEditableProfile,
  toPublicCard,
  toPublicDetail,
  type CertifiedInstructorRow,
} from "@/lib/instructors/mappers";
import { resolveCertifiedInstructorPublicSelect } from "@/lib/instructors/public-profile-columns";
import type {
  InstructorDirectoryFilters,
  InstructorProfileEditable,
  InstructorProfileUpdateInput,
  InstructorPublicCard,
  InstructorPublicDetail,
} from "@/lib/instructors/types";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Client = SupabaseClient<Database>;

async function requireClient(): Promise<Client> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

function asRow(data: unknown): CertifiedInstructorRow {
  return data as CertifiedInstructorRow;
}

function withPublicDefaults(row: CertifiedInstructorRow): CertifiedInstructorRow {
  return {
    ...row,
    profile_image_url: row.profile_image_url ?? null,
    public_display_name: row.public_display_name ?? "",
    legal_name: row.legal_name ?? "",
    show_legal_name: row.show_legal_name ?? false,
    headline: row.headline ?? "",
    bio: row.bio ?? "",
    career: row.career ?? "",
    activity_area: row.activity_area ?? "",
    service_area: row.service_area ?? "",
    online_available: row.online_available ?? false,
    yoga_specialties: row.yoga_specialties ?? [],
    pilates_specialties: row.pilates_specialties ?? [],
    specialties: row.specialties ?? [],
    available_programs: row.available_programs ?? [],
    instagram_url: row.instagram_url ?? "",
    website_url: row.website_url ?? "",
    contact_email: row.contact_email ?? "",
    is_public: row.is_public ?? false,
    recommendation_note: row.recommendation_note ?? "",
    display_order: row.display_order ?? 1000,
    profile_updated_at: row.profile_updated_at ?? null,
  };
}

export async function listPublicInstructors(
  filters: InstructorDirectoryFilters = {},
  client?: Client,
): Promise<InstructorPublicCard[]> {
  const applyFilters = (cards: InstructorPublicCard[]) =>
    cards.filter((card) => matchesDirectoryFilters(card, filters));

  if (!client && !isSupabaseConfigured()) {
    return applyFilters(mergePublicInstructorsWithRoster([]));
  }

  try {
    const supabase = client ?? (await requireClient());
    const schema = await resolveCertifiedInstructorPublicSelect(supabase);

    // 公開フラグ列が未適用のときは名簿のみ返す
    if (!schema.hasIsPublic) {
      return applyFilters(mergePublicInstructorsWithRoster([]));
    }

    let query = supabase
      .from("certified_instructors")
      .select(schema.select)
      .eq("is_public", true)
      .eq("status", "active");

    if (schema.hasDisplayOrder) {
      query = query.order("display_order", { ascending: true });
    }
    if (schema.hasPublicDisplayName) {
      query = query.order("public_display_name", { ascending: true });
    } else {
      query = query.order("display_name", { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error("[instructors] listPublicInstructors:", error.message);
      return applyFilters(mergePublicInstructorsWithRoster([]));
    }

    const cards = (data ?? []).map((row) =>
      toPublicCard(withPublicDefaults(asRow(row))),
    );
    return applyFilters(mergePublicInstructorsWithRoster(cards));
  } catch (error) {
    console.error("[instructors] listPublicInstructors fallback:", error);
    return applyFilters(mergePublicInstructorsWithRoster([]));
  }
}

export async function getPublicInstructor(
  id: string,
  client?: Client,
): Promise<InstructorPublicDetail | null> {
  const rosterHit = getRosterInstructor(id);
  if (!client && !isSupabaseConfigured()) {
    return rosterHit;
  }

  try {
    const supabase = client ?? (await requireClient());
    const schema = await resolveCertifiedInstructorPublicSelect(supabase);

    if (!schema.hasIsPublic) {
      return rosterHit;
    }

    const { data, error } = await supabase
      .from("certified_instructors")
      .select(schema.select)
      .eq("id", id)
      .eq("is_public", true)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("[instructors] getPublicInstructor:", error.message);
      return rosterHit;
    }
    if (!data) return rosterHit;
    return toPublicDetail(withPublicDefaults(asRow(data)));
  } catch (error) {
    console.error("[instructors] getPublicInstructor fallback:", error);
    return rosterHit;
  }
}

export async function getOwnInstructorProfile(
  client?: Client,
): Promise<InstructorProfileEditable | null> {
  const supabase = client ?? (await requireClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const schema = await resolveCertifiedInstructorPublicSelect(supabase);
  const { data, error } = await supabase
    .from("certified_instructors")
    .select(schema.select)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[instructors] getOwnInstructorProfile:", error.message);
    throw new Error(error.message);
  }
  if (!data) return null;
  return toEditableProfile(withPublicDefaults(asRow(data)));
}

function normalizeUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeStringArray(value: string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return value
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export async function updateOwnInstructorProfile(
  input: InstructorProfileUpdateInput,
  client?: Client,
): Promise<InstructorProfileEditable> {
  const supabase = client ?? (await requireClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const patch: Database["public"]["Tables"]["certified_instructors"]["Update"] =
    {};

  if (input.publicDisplayName !== undefined) {
    const name = input.publicDisplayName.trim().slice(0, 80);
    patch.public_display_name = name;
    patch.public_name = name;
  }
  if (input.legalName !== undefined) {
    patch.legal_name = input.legalName.trim().slice(0, 80);
  }
  if (input.showLegalName !== undefined) {
    patch.show_legal_name = Boolean(input.showLegalName);
  }
  if (input.headline !== undefined) {
    patch.headline = input.headline.trim().slice(0, 120);
  }
  if (input.bio !== undefined) {
    patch.bio = input.bio.trim().slice(0, 4000);
  }
  if (input.career !== undefined) {
    patch.career = input.career.trim().slice(0, 4000);
  }
  if (input.activityArea !== undefined) {
    patch.activity_area = input.activityArea.trim().slice(0, 120);
  }
  if (input.serviceArea !== undefined) {
    patch.service_area = input.serviceArea.trim().slice(0, 240);
  }
  if (input.onlineAvailable !== undefined) {
    patch.online_available = Boolean(input.onlineAvailable);
  }
  if (input.yogaSpecialties !== undefined) {
    patch.yoga_specialties = normalizeStringArray(input.yogaSpecialties);
  }
  if (input.pilatesSpecialties !== undefined) {
    patch.pilates_specialties = normalizeStringArray(input.pilatesSpecialties);
  }
  if (input.specialties !== undefined) {
    patch.specialties = normalizeStringArray(input.specialties);
  }
  if (input.availablePrograms !== undefined) {
    patch.available_programs = normalizeStringArray(input.availablePrograms);
  }
  if (input.instagramUrl !== undefined) {
    patch.instagram_url = normalizeUrl(input.instagramUrl) ?? "";
  }
  if (input.websiteUrl !== undefined) {
    patch.website_url = normalizeUrl(input.websiteUrl) ?? "";
  }
  if (input.contactEmail !== undefined) {
    patch.contact_email = input.contactEmail.trim().slice(0, 160);
  }
  if (input.isPublic !== undefined) {
    patch.is_public = Boolean(input.isPublic);
  }
  if (input.recommendationNote !== undefined) {
    patch.recommendation_note = input.recommendationNote.trim().slice(0, 500);
  }
  if (input.profileImageUrl !== undefined) {
    patch.profile_image_url = input.profileImageUrl;
  }

  const schema = await resolveCertifiedInstructorPublicSelect(supabase);
  const { data, error } = await supabase
    .from("certified_instructors")
    .update(patch)
    .eq("user_id", user.id)
    .select(schema.select)
    .maybeSingle();

  if (error) {
    console.error("[instructors] updateOwnInstructorProfile:", error.message);
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error(
      "認定講師レコードが見つかりません。本部にお問い合わせください。",
    );
  }
  return toEditableProfile(withPublicDefaults(asRow(data)));
}

/** 管理者: 任意の講師プロフィールを更新（運営上書き防止のため明示 API 経由のみ） */
export async function updateInstructorProfileAsAdmin(
  instructorId: string,
  input: InstructorProfileUpdateInput,
  client?: Client,
): Promise<InstructorProfileEditable> {
  const supabase = client ?? (await requireClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = String(
    profile && typeof profile === "object" && "role" in profile
      ? (profile as { role?: unknown }).role ?? ""
      : "",
  );
  if (role !== "admin" && role !== "super_admin") {
    throw new Error("管理者権限が必要です");
  }

  const patch: Database["public"]["Tables"]["certified_instructors"]["Update"] =
    {};
  if (input.publicDisplayName !== undefined) {
    const name = input.publicDisplayName.trim().slice(0, 80);
    patch.public_display_name = name;
    patch.public_name = name;
  }
  if (input.legalName !== undefined) {
    patch.legal_name = input.legalName.trim().slice(0, 80);
  }
  if (input.showLegalName !== undefined) {
    patch.show_legal_name = Boolean(input.showLegalName);
  }
  if (input.headline !== undefined) {
    patch.headline = input.headline.trim().slice(0, 120);
  }
  if (input.bio !== undefined) patch.bio = input.bio.trim().slice(0, 4000);
  if (input.career !== undefined) {
    patch.career = input.career.trim().slice(0, 4000);
  }
  if (input.activityArea !== undefined) {
    patch.activity_area = input.activityArea.trim().slice(0, 120);
  }
  if (input.serviceArea !== undefined) {
    patch.service_area = input.serviceArea.trim().slice(0, 240);
  }
  if (input.onlineAvailable !== undefined) {
    patch.online_available = Boolean(input.onlineAvailable);
  }
  if (input.yogaSpecialties !== undefined) {
    patch.yoga_specialties = normalizeStringArray(input.yogaSpecialties);
  }
  if (input.pilatesSpecialties !== undefined) {
    patch.pilates_specialties = normalizeStringArray(input.pilatesSpecialties);
  }
  if (input.specialties !== undefined) {
    patch.specialties = normalizeStringArray(input.specialties);
  }
  if (input.availablePrograms !== undefined) {
    patch.available_programs = normalizeStringArray(input.availablePrograms);
  }
  if (input.instagramUrl !== undefined) {
    patch.instagram_url = normalizeUrl(input.instagramUrl) ?? "";
  }
  if (input.websiteUrl !== undefined) {
    patch.website_url = normalizeUrl(input.websiteUrl) ?? "";
  }
  if (input.contactEmail !== undefined) {
    patch.contact_email = input.contactEmail.trim().slice(0, 160);
  }
  if (input.isPublic !== undefined) patch.is_public = Boolean(input.isPublic);
  if (input.recommendationNote !== undefined) {
    patch.recommendation_note = input.recommendationNote.trim().slice(0, 500);
  }
  if (input.profileImageUrl !== undefined) {
    patch.profile_image_url = input.profileImageUrl;
  }

  const schema = await resolveCertifiedInstructorPublicSelect(supabase);
  const { data, error } = await supabase
    .from("certified_instructors")
    .update(patch)
    .eq("id", instructorId)
    .select(schema.select)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("認定講師が見つかりません");
  return toEditableProfile(withPublicDefaults(asRow(data)));
}
