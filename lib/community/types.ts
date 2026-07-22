/** SWIJ Community domain types (V2.0 foundation). */

export type CommunityAnnouncementCategory =
  | "update"
  | "event"
  | "study"
  | "research";

export type CommunityDiscussionCategory =
  | "sleep_science"
  | "melatonin_yoga"
  | "case_consult"
  | "enterprise"
  | "retreat"
  | "other";

export type CommunityKnowledgeType =
  | "pdf"
  | "video"
  | "template"
  | "research";

export type CommunityEventType =
  | "study"
  | "zoom"
  | "retreat"
  | "training";

export type CommunityCaseGender = "female" | "male" | "other" | "unspecified";

export type CommunityLikeTarget = "discussion_post" | "discussion_comment" | "case";

export type CommunityAnnouncement = {
  id: string;
  category: CommunityAnnouncementCategory;
  title: string;
  body: string;
  publishedAt: string;
  pinned: boolean;
  authorName: string;
};

export type CommunityDiscussionPost = {
  id: string;
  authorId: string;
  authorName: string;
  category: CommunityDiscussionCategory;
  title: string;
  body: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunityDiscussionComment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  body: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};

export type CommunityCaseShare = {
  id: string;
  authorId: string;
  authorName: string;
  ageBand: string;
  gender: CommunityCaseGender;
  challenge: string;
  intervention: string;
  outcome: string;
  attachmentNote: string | null;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};

export type CommunityKnowledgeItem = {
  id: string;
  type: CommunityKnowledgeType;
  title: string;
  description: string;
  tags: string[];
  href: string | null;
  publishedAt: string;
};

export type CommunityEvent = {
  id: string;
  type: CommunityEventType;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  capacity: number | null;
  registrationUrl: string | null;
};

export type CommunityMessageThread = {
  id: string;
  peerName: string;
  peerRole: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

export type CommunityMessage = {
  id: string;
  threadId: string;
  fromMe: boolean;
  body: string;
  sentAt: string;
};

export type CommunityDashboardData = {
  displayName: string;
  announcements: CommunityAnnouncement[];
  discussions: CommunityDiscussionPost[];
  cases: CommunityCaseShare[];
  knowledge: CommunityKnowledgeItem[];
  events: CommunityEvent[];
  messageThreads: CommunityMessageThread[];
};
