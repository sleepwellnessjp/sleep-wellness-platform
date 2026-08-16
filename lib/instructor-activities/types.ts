export const INSTRUCTOR_ACTIVITY_BUCKET = "instructor-activity-images";
export const ACTIVITY_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const ACTIVITY_IMAGE_MAX_WIDTH = 1600;
export const ACTIVITY_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export type InstructorActivityStatus = "draft" | "published" | "archived";
export type InstructorActivityApproval =
  | "auto_approved"
  | "pending"
  | "approved"
  | "rejected";

export type InstructorActivity = {
  id: string;
  slug: string;
  instructorId: string;
  createdBy: string;
  title: string;
  imageUrl: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  isOnline: boolean;
  summary: string;
  description: string;
  target: string;
  capacity: string;
  price: string;
  applicationUrl: string;
  applicationMethod: string;
  notes: string;
  instructorName: string;
  instructorHeadline: string;
  instructorBio: string;
  instructorProfileImageUrl: string;
  instructorPublicId: string;
  status: InstructorActivityStatus;
  published: boolean;
  featured: boolean;
  approvalStatus: InstructorActivityApproval;
  createdAt: string;
  updatedAt: string;
};

export type InstructorActivityInput = {
  title: string;
  imageUrl: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  region?: string;
  venue?: string;
  isOnline?: boolean;
  summary: string;
  description?: string;
  target?: string;
  capacity?: string;
  price?: string;
  applicationUrl?: string;
  applicationMethod?: string;
  notes?: string;
  featured?: boolean;
  status?: InstructorActivityStatus;
  /** 本部登録時のみ。認定講師本人の登録では無視する */
  instructorId?: string;
};

export type AssignableInstructorOption = {
  id: string;
  name: string;
  email: string;
};

export type PublicActivityCard = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  eventDate: string;
  locationLabel: string;
  instructorName: string;
  instructorId: string;
};

export type InstructorActivityJoin = {
  id: string;
  public_name?: string | null;
  public_display_name?: string | null;
  display_name?: string | null;
  legal_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
};

export type InstructorActivityRow = {
  id: string;
  slug: string;
  instructor_id: string;
  created_by: string;
  title: string;
  image_url: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  is_online: boolean;
  summary: string;
  description: string;
  target: string;
  capacity: string;
  price: string;
  application_url: string;
  application_method: string;
  notes: string;
  instructor_name: string;
  status: InstructorActivityStatus;
  published: boolean;
  featured: boolean;
  approval_status: InstructorActivityApproval;
  created_at: string;
  updated_at: string;
  certified_instructors?: InstructorActivityJoin | InstructorActivityJoin[] | null;
};
