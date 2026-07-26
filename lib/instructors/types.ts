/**
 * メラトニンヨガ™認定講師 — 公開プロフィール型
 * 医療資格と誤解されないよう、資格表示は「メラトニンヨガ™認定講師」に統一。
 */

export const CERTIFIED_INSTRUCTOR_TITLE = "メラトニンヨガ™認定講師";

export const INSTRUCTOR_PROFILE_BUCKET = "instructor-profiles";

/** 元画像の上限（バイト）。これを超えるとエラー。 */
export const PROFILE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/** 圧縮後の目標辺長（正方形） */
export const PROFILE_IMAGE_OUTPUT_SIZE = 800;

export const PROFILE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export type InstructorPublicCard = {
  id: string;
  activityName: string;
  legalName: string | null;
  certificationLabel: string;
  headline: string;
  bio: string;
  activityArea: string;
  onlineAvailable: boolean;
  yogaSpecialties: string[];
  pilatesSpecialties: string[];
  specialties: string[];
  profileImageUrl: string | null;
  instagramUrl: string;
  websiteUrl: string;
  contactEmail: string;
  levelId: string;
};

export type InstructorPublicDetail = InstructorPublicCard & {
  career: string;
  serviceArea: string;
  availablePrograms: string[];
};

export type InstructorProfileEditable = {
  id: string;
  userId: string;
  profileImageUrl: string | null;
  publicDisplayName: string;
  legalName: string;
  showLegalName: boolean;
  headline: string;
  bio: string;
  career: string;
  activityArea: string;
  serviceArea: string;
  onlineAvailable: boolean;
  yogaSpecialties: string[];
  pilatesSpecialties: string[];
  specialties: string[];
  availablePrograms: string[];
  instagramUrl: string;
  websiteUrl: string;
  contactEmail: string;
  isPublic: boolean;
  recommendationNote: string;
  displayOrder: number;
  profileUpdatedAt: string | null;
  /** 運営側の表示名（本人は変更不可・参照のみ） */
  displayName: string;
  levelId: string;
  certificationLabel: string;
  status: string;
};

export type InstructorProfileUpdateInput = {
  publicDisplayName?: string;
  legalName?: string;
  showLegalName?: boolean;
  headline?: string;
  bio?: string;
  career?: string;
  activityArea?: string;
  serviceArea?: string;
  onlineAvailable?: boolean;
  yogaSpecialties?: string[];
  pilatesSpecialties?: string[];
  specialties?: string[];
  availablePrograms?: string[];
  instagramUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  isPublic?: boolean;
  recommendationNote?: string;
  profileImageUrl?: string | null;
};

export type InstructorDirectoryFilters = {
  query?: string;
  activityArea?: string;
  onlineOnly?: boolean;
  yoga?: boolean;
  matPilates?: boolean;
  machinePilates?: boolean;
  melatoninYoga?: boolean;
  sleepWellnessCert?: boolean;
};

export const YOGA_SPECIALTY_OPTIONS = [
  "メラトニンヨガ™",
  "ハタヨガ",
  "陰ヨガ",
  "リストラティブヨガ",
  "呼吸法・プラナヤマ",
  "瞑想",
] as const;

export const PILATES_SPECIALTY_OPTIONS = [
  "マットピラティス",
  "マシンピラティス",
] as const;

export const PROGRAM_OPTIONS = [
  "メラトニンヨガ™",
  "Sleep Wellness セッション",
  "睡眠分析フォロー",
  "企業向けワークショップ",
  "オンラインレッスン",
] as const;
