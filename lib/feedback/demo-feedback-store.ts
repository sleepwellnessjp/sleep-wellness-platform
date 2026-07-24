import type {
  CreateFeedbackInput,
  FeedbackRecord,
  FeedbackStatus,
  UpdateFeedbackAdminInput,
} from "./types";

const DEMO_USER_ID = "demo-instructor";

let memoryStore: FeedbackRecord[] = [
  {
    id: "fb-demo-1",
    userId: DEMO_USER_ID,
    userEmail: "demo@swij.local",
    userDisplayName: "デモ インストラクター",
    category: "improvement",
    targetScreen: "analysis",
    severity: "medium",
    content:
      "分析確認画面で、スコアの説明がもう少し短いとモバイルで読みやすいです。",
    reproductionSteps: "1. Analysis を開く\n2. 確認画面へ進む",
    device: "スマホ",
    browser: "Safari",
    currentUrl: "http://localhost:3000/analysis/confirm",
    screenName: "Analysis",
    deviceType: "mobile",
    browserInfo: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    appVersion: "2.7.0",
    usabilityRating: 4,
    priority: "p2",
    status: "unconfirmed",
    adminMemo: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: "fb-demo-2",
    userId: "demo-admin-viewer",
    userEmail: "instructor2@swij.local",
    userDisplayName: "佐藤 美咲",
    category: "bug",
    targetScreen: "homework",
    severity: "high",
    content: "宿題完了チェック後に一覧が更新されないことがあります。",
    reproductionSteps:
      "1. Homework を開く\n2. 完了にする\n3. 画面をスクロールして戻る",
    device: "PC",
    browser: "Chrome",
    currentUrl: "http://localhost:3000/homework",
    screenName: "Homework",
    deviceType: "pc",
    browserInfo: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126",
    appVersion: "2.7.0",
    usabilityRating: 3,
    priority: "p1",
    status: "reviewing",
    adminMemo: "再現手順を確認中",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "fb-demo-3",
    userId: DEMO_USER_ID,
    userEmail: "demo@swij.local",
    userDisplayName: "デモ インストラクター",
    category: "feature_request",
    targetScreen: "journey",
    severity: "low",
    content: "Journey の進捗を PDF でクライアントに渡せるようにしたいです。",
    reproductionSteps: "",
    device: "PC",
    browser: "Safari",
    currentUrl: "http://localhost:3000/journey",
    screenName: "Journey",
    deviceType: "pc",
    browserInfo: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    appVersion: "2.7.0",
    usabilityRating: 5,
    priority: "p3",
    status: "on_hold",
    adminMemo: "Version 2.8 候補として保留",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

function sortByCreatedDesc(list: FeedbackRecord[]): FeedbackRecord[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listDemoFeedback(options?: {
  userId?: string;
  category?: string;
  severity?: string;
  status?: string;
}): FeedbackRecord[] {
  let list = memoryStore;
  if (options?.userId) {
    list = list.filter((item) => item.userId === options.userId);
  }
  if (options?.category && options.category !== "all") {
    list = list.filter((item) => item.category === options.category);
  }
  if (options?.severity && options.severity !== "all") {
    list = list.filter((item) => item.severity === options.severity);
  }
  if (options?.status && options.status !== "all") {
    list = list.filter((item) => item.status === options.status);
  }
  return sortByCreatedDesc(list);
}

export function createDemoFeedback(
  input: CreateFeedbackInput,
  actor: {
    userId: string;
    email: string | null;
    displayName: string | null;
  },
): FeedbackRecord {
  const now = new Date().toISOString();
  const record: FeedbackRecord = {
    id: `fb-demo-${Date.now()}`,
    userId: actor.userId,
    userEmail: actor.email,
    userDisplayName: actor.displayName,
    category: input.category,
    targetScreen: input.targetScreen,
    severity: input.severity,
    content: input.content.trim(),
    reproductionSteps: (input.reproductionSteps ?? "").trim(),
    device: (input.device ?? "").trim(),
    browser: (input.browser ?? "").trim(),
    currentUrl: (input.currentUrl ?? "").trim(),
    screenName: (input.screenName ?? "").trim(),
    deviceType: input.deviceType ?? "",
    browserInfo: (input.browserInfo ?? "").trim(),
    appVersion: (input.appVersion ?? "").trim(),
    usabilityRating: input.usabilityRating ?? null,
    priority: "p2",
    status: "unconfirmed",
    adminMemo: "",
    createdAt: now,
    updatedAt: now,
  };
  memoryStore = [record, ...memoryStore];
  return record;
}

export function updateDemoFeedback(
  input: UpdateFeedbackAdminInput,
): FeedbackRecord {
  const index = memoryStore.findIndex((item) => item.id === input.id);
  if (index < 0) {
    throw new Error("フィードバックが見つかりません");
  }
  const current = memoryStore[index]!;
  const next: FeedbackRecord = {
    ...current,
    status: (input.status ?? current.status) as FeedbackStatus,
    adminMemo:
      input.adminMemo !== undefined ? input.adminMemo : current.adminMemo,
    priority: input.priority ?? current.priority,
    updatedAt: new Date().toISOString(),
  };
  memoryStore = [
    ...memoryStore.slice(0, index),
    next,
    ...memoryStore.slice(index + 1),
  ];
  return next;
}

export function getDemoFeedbackActor() {
  return {
    userId: DEMO_USER_ID,
    email: "demo@swij.local",
    displayName: "デモ インストラクター",
  };
}
