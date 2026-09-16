/**
 * 公開講師ディレクトリ（ビュー certified_instructors_directory）
 * email / admin_memo / user_id は含まない。
 */

export const INSTRUCTOR_DIRECTORY_VIEW = "certified_instructors_directory" as const;

/** ビューに存在する列だけ（SELECT 用） */
export const INSTRUCTOR_DIRECTORY_COLUMNS = [
  "id",
  "public_name",
  "public_display_name",
  "display_name",
  "legal_name",
  "show_legal_name",
  "level_id",
  "headline",
  "bio",
  "career",
  "activity_area",
  "service_area",
  "online_available",
  "yoga_specialties",
  "pilates_specialties",
  "specialties",
  "available_programs",
  "profile_image_url",
  "instagram_url",
  "website_url",
  "contact_email",
  "display_order",
] as const;

export const INSTRUCTOR_DIRECTORY_SELECT =
  INSTRUCTOR_DIRECTORY_COLUMNS.join(", ");

export type InstructorDirectoryRow = {
  id: string;
  public_name: string | null;
  public_display_name: string | null;
  display_name: string | null;
  legal_name: string | null;
  show_legal_name: boolean | null;
  level_id: string | null;
  headline: string | null;
  bio: string | null;
  career: string | null;
  activity_area: string | null;
  service_area: string | null;
  online_available: boolean | null;
  yoga_specialties: string[] | null;
  pilates_specialties: string[] | null;
  specialties: string[] | null;
  available_programs: string[] | null;
  profile_image_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  display_order: number | null;
};
