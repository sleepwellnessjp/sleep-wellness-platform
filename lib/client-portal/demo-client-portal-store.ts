import type {
  ClientGoalProgress,
  ClientPortalMessage,
  ClientPortalNotification,
  ClientPortalPrefs,
  CreateClientGoalInput,
  CreateClientMessageInput,
} from "./types";

const DEMO_CLIENT_ID = "demo-client-1";
const DEMO_INSTRUCTOR_ID = "demo-instructor";
const DEMO_CLIENT_USER_ID = "demo-client-user";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

let prefs: ClientPortalPrefs = {
  portalEnabled: true,
  currentGoalSummary: "就寝時刻を23:00までに安定させる",
  improvementTargetScore: 85,
  notificationPrefs: { homework: true, message: true, report: true },
  lastPortalSeenAt: isoDaysAgo(0),
};

let messages: ClientPortalMessage[] = [
  {
    id: "msg-demo-1",
    clientId: DEMO_CLIENT_ID,
    instructorId: DEMO_INSTRUCTOR_ID,
    senderRole: "instructor",
    senderId: DEMO_INSTRUCTOR_ID,
    body: "今週の深睡眠の改善、素晴らしいです。就寝前の照明オフを続けましょう。",
    readAt: isoDaysAgo(1),
    createdAt: isoDaysAgo(2),
    updatedAt: isoDaysAgo(2),
  },
  {
    id: "msg-demo-2",
    clientId: DEMO_CLIENT_ID,
    instructorId: DEMO_INSTRUCTOR_ID,
    senderRole: "client",
    senderId: DEMO_CLIENT_USER_ID,
    body: "メラトニンヨガ™を3日続けました。入眠が少し楽になった気がします。",
    readAt: isoDaysAgo(1),
    createdAt: isoDaysAgo(1),
    updatedAt: isoDaysAgo(1),
  },
  {
    id: "msg-demo-3",
    clientId: DEMO_CLIENT_ID,
    instructorId: DEMO_INSTRUCTOR_ID,
    senderRole: "instructor",
    senderId: DEMO_INSTRUCTOR_ID,
    body: "続けてください。次回の分析でHRVの変化も一緒に確認しましょう。",
    readAt: null,
    createdAt: isoDaysAgo(0),
    updatedAt: isoDaysAgo(0),
  },
];

let notifications: ClientPortalNotification[] = [
  {
    id: "ntf-demo-1",
    clientId: DEMO_CLIENT_ID,
    kind: "homework",
    title: "新しい宿題",
    body: "就寝30分前の照明ダウンが追加されました",
    href: "/client/homework",
    readAt: null,
    createdAt: isoDaysAgo(0),
    updatedAt: isoDaysAgo(0),
  },
  {
    id: "ntf-demo-2",
    clientId: DEMO_CLIENT_ID,
    kind: "message",
    title: "認定講師からメッセージ",
    body: "深睡眠の改善についてコメントがあります",
    href: "/client/chat",
    readAt: isoDaysAgo(0),
    createdAt: isoDaysAgo(1),
    updatedAt: isoDaysAgo(1),
  },
  {
    id: "ntf-demo-3",
    clientId: DEMO_CLIENT_ID,
    kind: "report",
    title: "改善レポート",
    body: "最新の Sleep Report を確認できます",
    href: "/client/reports",
    readAt: isoDaysAgo(2),
    createdAt: isoDaysAgo(3),
    updatedAt: isoDaysAgo(3),
  },
];

let goals: ClientGoalProgress[] = [
  {
    id: "goal-demo-1",
    clientId: DEMO_CLIENT_ID,
    instructorId: DEMO_INSTRUCTOR_ID,
    title: "Sleep Wellness Score 85",
    description: "初回から継続的にスコアを引き上げる",
    category: "sleep",
    targetValue: 85,
    currentValue: 78,
    unit: "点",
    progressPercent: 72,
    status: "active",
    startsOn: isoDaysAgo(28).slice(0, 10),
    targetOn: isoDaysAgo(-30).slice(0, 10),
    achievedAt: null,
    createdAt: isoDaysAgo(28),
    updatedAt: isoDaysAgo(0),
  },
  {
    id: "goal-demo-2",
    clientId: DEMO_CLIENT_ID,
    instructorId: DEMO_INSTRUCTOR_ID,
    title: "就寝前ルーティン定着",
    description: "週5日以上、就寝30分前に照明を暗くする",
    category: "lifestyle",
    targetValue: 5,
    currentValue: 4,
    unit: "日/週",
    progressPercent: 80,
    status: "active",
    startsOn: isoDaysAgo(14).slice(0, 10),
    targetOn: isoDaysAgo(-14).slice(0, 10),
    achievedAt: null,
    createdAt: isoDaysAgo(14),
    updatedAt: isoDaysAgo(0),
  },
  {
    id: "goal-demo-3",
    clientId: DEMO_CLIENT_ID,
    instructorId: DEMO_INSTRUCTOR_ID,
    title: "宿題完了率 80%",
    description: "認定講師から出された宿題を継続完了する",
    category: "homework",
    targetValue: 80,
    currentValue: 80,
    unit: "%",
    progressPercent: 100,
    status: "achieved",
    startsOn: isoDaysAgo(21).slice(0, 10),
    targetOn: isoDaysAgo(0).slice(0, 10),
    achievedAt: isoDaysAgo(1),
    createdAt: isoDaysAgo(21),
    updatedAt: isoDaysAgo(1),
  },
];

export function getDemoClientPortalActor(): {
  userId: string;
  role: "client" | "instructor";
  clientId: string;
} {
  return {
    userId: DEMO_CLIENT_USER_ID,
    role: "client",
    clientId: DEMO_CLIENT_ID,
  };
}

export function getDemoPortalPrefs(): ClientPortalPrefs {
  return { ...prefs, notificationPrefs: { ...prefs.notificationPrefs } };
}

export function touchDemoPortalSeen(): ClientPortalPrefs {
  prefs = {
    ...prefs,
    lastPortalSeenAt: new Date().toISOString(),
  };
  return getDemoPortalPrefs();
}

export function listDemoMessages(clientId?: string): ClientPortalMessage[] {
  const id = clientId ?? DEMO_CLIENT_ID;
  return messages
    .filter((m) => m.clientId === id)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function createDemoMessage(
  input: CreateClientMessageInput,
  actor: { userId: string; role: "client" | "instructor" },
): ClientPortalMessage {
  const now = new Date().toISOString();
  const row: ClientPortalMessage = {
    id: createId("msg"),
    clientId: input.clientId || DEMO_CLIENT_ID,
    instructorId: DEMO_INSTRUCTOR_ID,
    senderRole: input.asRole ?? actor.role,
    senderId: actor.userId,
    body: input.body.trim(),
    readAt: null,
    createdAt: now,
    updatedAt: now,
  };
  messages = [...messages, row];
  return row;
}

export function markDemoMessagesRead(clientId: string): number {
  let count = 0;
  const now = new Date().toISOString();
  messages = messages.map((m) => {
    if (m.clientId !== clientId || m.readAt || m.senderRole === "client") {
      return m;
    }
    count += 1;
    return { ...m, readAt: now, updatedAt: now };
  });
  return count;
}

export function listDemoNotifications(
  clientId?: string,
): ClientPortalNotification[] {
  const id = clientId ?? DEMO_CLIENT_ID;
  return notifications
    .filter((n) => n.clientId === id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markDemoNotificationRead(id: string): ClientPortalNotification | null {
  const now = new Date().toISOString();
  let found: ClientPortalNotification | null = null;
  notifications = notifications.map((n) => {
    if (n.id !== id) return n;
    found = { ...n, readAt: now, updatedAt: now };
    return found;
  });
  return found;
}

export function listDemoGoals(clientId?: string): ClientGoalProgress[] {
  const id = clientId ?? DEMO_CLIENT_ID;
  return goals
    .filter((g) => g.clientId === id)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createDemoGoal(input: CreateClientGoalInput): ClientGoalProgress {
  const now = new Date().toISOString();
  const progress =
    input.progressPercent != null
      ? Math.max(0, Math.min(100, Math.round(input.progressPercent)))
      : 0;
  const row: ClientGoalProgress = {
    id: createId("goal"),
    clientId: input.clientId || DEMO_CLIENT_ID,
    instructorId: DEMO_INSTRUCTOR_ID,
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    category: input.category ?? "sleep",
    targetValue: input.targetValue ?? null,
    currentValue: input.currentValue ?? null,
    unit: input.unit ?? "",
    progressPercent: progress,
    status: progress >= 100 ? "achieved" : "active",
    startsOn: input.startsOn ?? now.slice(0, 10),
    targetOn: input.targetOn ?? null,
    achievedAt: progress >= 100 ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  goals = [row, ...goals];
  return row;
}

export function updateDemoGoalProgress(
  id: string,
  patch: Partial<
    Pick<
      ClientGoalProgress,
      | "currentValue"
      | "progressPercent"
      | "status"
      | "description"
      | "title"
    >
  >,
): ClientGoalProgress | null {
  const now = new Date().toISOString();
  let found: ClientGoalProgress | null = null;
  goals = goals.map((g) => {
    if (g.id !== id) return g;
    const progressPercent =
      patch.progressPercent != null
        ? Math.max(0, Math.min(100, Math.round(patch.progressPercent)))
        : g.progressPercent;
    const status =
      patch.status ??
      (progressPercent >= 100 ? "achieved" : g.status === "achieved" ? "active" : g.status);
    found = {
      ...g,
      ...patch,
      progressPercent,
      status,
      achievedAt:
        status === "achieved" ? (g.achievedAt ?? now) : g.achievedAt,
      updatedAt: now,
    };
    return found;
  });
  return found;
}
