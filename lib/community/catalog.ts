import type {
  CommunityAnnouncementCategory,
  CommunityDiscussionCategory,
  CommunityEventType,
  CommunityKnowledgeType,
  CommunityCaseGender,
} from "./types";

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<
  CommunityAnnouncementCategory,
  string
> = {
  update: "アップデート",
  event: "イベント",
  study: "勉強会",
  research: "研究会",
};

export const DISCUSSION_CATEGORY_LABELS: Record<
  CommunityDiscussionCategory,
  string
> = {
  sleep_science: "睡眠科学",
  melatonin_yoga: "メラトニンヨガ™",
  case_consult: "ケース相談",
  enterprise: "企業導入",
  retreat: "リトリート",
  other: "その他",
};

export const KNOWLEDGE_TYPE_LABELS: Record<CommunityKnowledgeType, string> = {
  pdf: "PDF",
  video: "動画",
  template: "テンプレート",
  research: "研究資料",
};

export const EVENT_TYPE_LABELS: Record<CommunityEventType, string> = {
  study: "勉強会",
  zoom: "Zoom",
  retreat: "リトリート",
  training: "養成講座",
};

export const CASE_GENDER_LABELS: Record<CommunityCaseGender, string> = {
  female: "女性",
  male: "男性",
  other: "その他",
  unspecified: "非公開",
};

export const DISCUSSION_CATEGORIES = Object.keys(
  DISCUSSION_CATEGORY_LABELS,
) as CommunityDiscussionCategory[];

export const AGE_BAND_OPTIONS = [
  "20代",
  "30代",
  "40代",
  "50代",
  "60代以上",
] as const;

export function formatCommunityDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function formatCommunityDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}
