/**
 * Demo Mode — 全画面共通のデモクライアント定義。
 * Dashboard / Clients / Analysis / Journey / Homework / Report / Demo が同じ ID・氏名を使う。
 * 実データ（Supabase）とは完全に分離したサンプルのみ。
 */

export type DemoClientGender = "female" | "male" | "other" | "unspecified";

export type DemoClient = {
  id: string;
  name: string;
  age: number;
  gender: DemoClientGender;
  sleepScore: number | null;
  /** ISO date YYYY-MM-DD */
  lastAnalysisDate: string | null;
  /** ISO date YYYY-MM-DD */
  nextFollowUpDate: string | null;
  /** ISO date YYYY-MM-DD */
  assignedDay: string | null;
  journeyProgress: number;
  instructorName: string;
};

export type DemoInstructor = {
  id: string;
  name: string;
  /** 呼びかけ用の姓 */
  displayName: string;
  title: string;
  specialty: string;
  region: string;
};

export const DEMO_INSTRUCTOR: DemoInstructor = {
  id: "instructor-demo-1",
  name: "山田 真由美",
  displayName: "山田",
  title: "認定講師",
  specialty: "メラトニンヨガ / 睡眠コーチング",
  region: "東京",
};

/** @deprecated Use DEMO_INSTRUCTOR.displayName */
export const DEMO_INSTRUCTOR_NAME = DEMO_INSTRUCTOR.displayName;

/** カノニカル・デモクライアント（12名） */
export const DEMO_CLIENTS: readonly DemoClient[] = [
  {
    id: "client-demo-1",
    name: "佐藤 美咲",
    age: 42,
    gender: "female",
    sleepScore: 72,
    lastAnalysisDate: "2026-07-18",
    nextFollowUpDate: "2026-07-25",
    assignedDay: "2026-07-25",
    journeyProgress: 68,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-2",
    name: "鈴木 健太",
    age: 38,
    gender: "male",
    sleepScore: 61,
    lastAnalysisDate: "2026-07-15",
    nextFollowUpDate: "2026-07-24",
    assignedDay: "2026-07-24",
    journeyProgress: 42,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-3",
    name: "田中 あかり",
    age: 35,
    gender: "female",
    sleepScore: 78,
    lastAnalysisDate: "2026-07-20",
    nextFollowUpDate: "2026-07-28",
    assignedDay: "2026-07-28",
    journeyProgress: 85,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-4",
    name: "伊藤 翔",
    age: 29,
    gender: "male",
    sleepScore: null,
    lastAnalysisDate: null,
    nextFollowUpDate: "2026-07-26",
    assignedDay: "2026-07-26",
    journeyProgress: 12,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-5",
    name: "高橋 恵",
    age: 51,
    gender: "female",
    sleepScore: 55,
    lastAnalysisDate: "2026-07-10",
    nextFollowUpDate: "2026-07-30",
    assignedDay: "2026-07-23",
    journeyProgress: 34,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-6",
    name: "渡辺 涼",
    age: 44,
    gender: "male",
    sleepScore: 69,
    lastAnalysisDate: "2026-07-19",
    nextFollowUpDate: "2026-08-02",
    assignedDay: "2026-07-23",
    journeyProgress: 57,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-7",
    name: "中村 結衣",
    age: 33,
    gender: "female",
    sleepScore: 81,
    lastAnalysisDate: "2026-07-21",
    nextFollowUpDate: "2026-08-05",
    assignedDay: "2026-07-29",
    journeyProgress: 91,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-8",
    name: "小林 大輔",
    age: 47,
    gender: "male",
    sleepScore: 64,
    lastAnalysisDate: "2026-07-12",
    nextFollowUpDate: "2026-07-27",
    assignedDay: "2026-07-27",
    journeyProgress: 48,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-9",
    name: "加藤 里奈",
    age: 36,
    gender: "female",
    sleepScore: 70,
    lastAnalysisDate: "2026-07-17",
    nextFollowUpDate: "2026-07-31",
    assignedDay: "2026-07-31",
    journeyProgress: 62,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-10",
    name: "吉田 拓也",
    age: 41,
    gender: "male",
    sleepScore: 58,
    lastAnalysisDate: "2026-07-14",
    nextFollowUpDate: "2026-07-29",
    assignedDay: "2026-07-29",
    journeyProgress: 38,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-11",
    name: "松本 さくら",
    age: 28,
    gender: "female",
    sleepScore: 76,
    lastAnalysisDate: "2026-07-22",
    nextFollowUpDate: "2026-08-01",
    assignedDay: "2026-08-01",
    journeyProgress: 74,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
  {
    id: "client-demo-12",
    name: "井上 誠",
    age: 53,
    gender: "male",
    sleepScore: 66,
    lastAnalysisDate: "2026-07-16",
    nextFollowUpDate: "2026-07-28",
    assignedDay: "2026-07-28",
    journeyProgress: 51,
    instructorName: DEMO_INSTRUCTOR_NAME,
  },
] as const;

export const DEFAULT_DEMO_CLIENT_ID = DEMO_CLIENTS[0].id;

export function getDemoClientById(id: string): DemoClient | undefined {
  return DEMO_CLIENTS.find((client) => client.id === id);
}

export function getDefaultDemoClient(): DemoClient {
  return DEMO_CLIENTS[0];
}
