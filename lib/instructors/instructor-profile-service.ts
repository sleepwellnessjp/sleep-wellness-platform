import type { SupabaseClient } from "@supabase/supabase-js";
import {
  matchesDirectoryFilters,
  toEditableProfile,
  toPublicCard,
  toPublicDetail,
  type CertifiedInstructorRow,
} from "@/lib/instructors/mappers";
import type {
  InstructorDirectoryFilters,
  InstructorProfileEditable,
  InstructorProfileUpdateInput,
  InstructorPublicCard,
  InstructorPublicDetail,
} from "@/lib/instructors/types";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Client = SupabaseClient<Database>;

const PUBLIC_SELECT =
  "id, user_id, school_id, level_id, instructor_number, display_name, email, status, certified_at, renews_at, usage_start_date, suspended_at, withdrawn_at, last_renewed_at, status_history, admin_memo, created_at, updated_at, profile_image_url, public_display_name, legal_name, show_legal_name, headline, bio, career, activity_area, service_area, online_available, yoga_specialties, pilates_specialties, specialties, available_programs, instagram_url, website_url, contact_email, is_public, recommendation_note, display_order, profile_updated_at";

async function requireClient(): Promise<Client> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

function asRow(data: unknown): CertifiedInstructorRow {
  return data as CertifiedInstructorRow;
}

export async function listPublicInstructors(
  filters: InstructorDirectoryFilters = {},
  client?: Client,
): Promise<InstructorPublicCard[]> {
  const supabase = client ?? (await requireClient());
  const { data, error } = await supabase
    .from("certified_instructors")
    .select(PUBLIC_SELECT)
    .eq("is_public", true)
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .order("public_display_name", { ascending: true });

  if (error) {
    console.error("[instructors] listPublicInstructors:", error.message);
    throw new Error(error.message);
  }

  const cards = (data ?? []).map((row) => toPublicCard(asRow(row)));
  return cards.filter((card) => matchesDirectoryFilters(card, filters));
}

export async function getPublicInstructor(
  id: string,
  client?: Client,
): Promise<InstructorPublicDetail | null> {
  const supabase = client ?? (await requireClient());
  const { data, error } = await supabase
    .from("certified_instructors")
    .select(PUBLIC_SELECT)
    .eq("id", id)
    .eq("is_public", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[instructors] getPublicInstructor:", error.message);
    throw new Error(error.message);
  }
  if (!data) return null;
  return toPublicDetail(asRow(data));
}

export async function getOwnInstructorProfile(
  client?: Client,
): Promise<InstructorProfileEditable | null> {
  const supabase = client ?? (await requireClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("certified_instructors")
    .select(PUBLIC_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[instructors] getOwnInstructorProfile:", error.message);
    throw new Error(error.message);
  }
  if (!data) return null;
  return toEditableProfile(asRow(data));
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
    patch.public_display_name = input.publicDisplayName.trim().slice(0, 80);
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

  const { data, error } = await supabase
    .from("certified_instructors")
    .update(patch)
    .eq("user_id", user.id)
    .select(PUBLIC_SELECT)
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
  return toEditableProfile(asRow(data));
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
    patch.public_display_name = input.publicDisplayName.trim().slice(0, 80);
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

  const { data, error } = await supabase
    .from("certified_instructors")
    .update(patch)
    .eq("id", instructorId)
    .select(PUBLIC_SELECT)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("認定講師が見つかりません");
  return toEditableProfile(asRow(data));
}
