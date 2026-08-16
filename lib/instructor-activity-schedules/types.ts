export type InstructorActivitySchedule = {
  id: string;
  instructorId: string;
  createdBy: string;
  activityDate: string;
  title: string;
  summary: string;
  externalUrl: string;
  instructorName: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InstructorActivityScheduleInput = {
  activityDate: string;
  title: string;
  summary: string;
  externalUrl: string;
  published?: boolean;
  instructorId?: string;
};

export type PublicActivityScheduleItem = {
  id: string;
  activityDate: string;
  title: string;
  summary: string;
  externalUrl: string;
  instructorName: string;
};

export type ScheduleInstructorOption = {
  id: string;
  name: string;
  email: string;
};

export type InstructorActivityScheduleRow = {
  id: string;
  instructor_id: string;
  created_by: string;
  activity_date: string;
  title: string;
  summary: string;
  external_url: string;
  instructor_name: string;
  published?: boolean | null;
  created_at: string;
  updated_at: string;
};
