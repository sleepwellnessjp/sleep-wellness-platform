import type {
  MelatoninYogaSession,
  MelatoninYogaSessionDay,
  MelatoninYogaSessionDayFormState,
  MelatoninYogaSessionFormState,
  MelatoninYogaSessionInput,
} from "@/lib/melatonin-yoga/types";

const JST = "Asia/Tokyo";

/** ISO timestamptz → datetime-local 用（日本時間） */
export function isoToDatetimeLocalJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** datetime-local（日本時間として解釈）→ ISO timestamptz */
export function datetimeLocalJstToIso(local: string): string | null {
  const trimmed = local.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}:00+09:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

/** 日付 + 時刻（日本時間）→ ISO timestamptz */
export function dateAndTimeJstToIso(
  dateLocal: string,
  timeLocal: string,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateLocal.trim())) return null;
  if (!/^\d{2}:\d{2}$/.test(timeLocal.trim())) return null;
  return datetimeLocalJstToIso(`${dateLocal.trim()}T${timeLocal.trim()}`);
}

function formatTimeJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("ja-JP", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 開催日1行表示: 2027年2月13日（土）10:00〜17:00 */
export function formatSessionDayLineJst(
  startsAt: string,
  endsAt: string,
): string {
  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) return "—";

  const datePart = startDate.toLocaleDateString("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });

  return `${datePart}${formatTimeJst(startsAt)}〜${formatTimeJst(endsAt)}`;
}

/** 開催日一覧 + 補足 */
export function formatSessionScheduleDisplay(session: {
  days: Pick<MelatoninYogaSessionDay, "startsAt" | "endsAt">[];
  scheduleNote: string;
}): { dayLines: string[]; scheduleNote: string | null } {
  const dayLines = session.days.map((day) =>
    formatSessionDayLineJst(day.startsAt, day.endsAt),
  );
  const note = session.scheduleNote.trim();
  return {
    dayLines,
    scheduleNote: note || null,
  };
}

/** 開催済み判定（親の ends_at、なければ starts_at） */
export function isSessionPast(
  session: Pick<MelatoninYogaSession, "startsAt" | "endsAt">,
): boolean {
  const referenceIso = session.endsAt ?? session.startsAt;
  const date = new Date(referenceIso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function isoToDateAndTimeJst(iso: string): {
  dateLocal: string;
  timeLocal: string;
} {
  const local = isoToDatetimeLocalJst(iso);
  if (!local) return { dateLocal: "", timeLocal: "" };
  const [dateLocal, timeLocal = ""] = local.split("T");
  return { dateLocal, timeLocal };
}

export function sessionDayToFormState(
  day: Pick<MelatoninYogaSessionDay, "startsAt" | "endsAt">,
  clientKey: string,
): MelatoninYogaSessionDayFormState {
  const start = isoToDateAndTimeJst(day.startsAt);
  const end = isoToDateAndTimeJst(day.endsAt);
  return {
    clientKey,
    dateLocal: start.dateLocal,
    startTimeLocal: start.timeLocal,
    endTimeLocal: end.timeLocal,
  };
}

export function sessionToFormState(
  session: Pick<
    MelatoninYogaSession,
    | "eventType"
    | "days"
    | "format"
    | "location"
    | "capacity"
    | "registrationClosed"
    | "published"
    | "adminNote"
    | "scheduleNote"
    | "feeNote"
    | "archiveAvailable"
  >,
): MelatoninYogaSessionFormState {
  return {
    eventType: session.eventType,
    days:
      session.days.length > 0
        ? session.days.map((day) =>
            sessionDayToFormState(day, crypto.randomUUID()),
          )
        : [emptySessionDayFormState()],
    scheduleNote: session.scheduleNote,
    feeNote: session.feeNote,
    format: session.format,
    location: session.location,
    capacity: session.capacity,
    registrationClosed: session.registrationClosed,
    published: session.published,
    archiveAvailable: session.archiveAvailable,
    adminNote: session.adminNote,
  };
}

export function formStateToSessionInput(
  state: MelatoninYogaSessionFormState,
): { ok: true; input: MelatoninYogaSessionInput } | { ok: false; error: string } {
  if (state.days.length < 1) {
    return { ok: false, error: "開催日を1日以上入力してください" };
  }

  const days: MelatoninYogaSessionInput["days"] = [];

  for (let index = 0; index < state.days.length; index += 1) {
    const day = state.days[index];
    const label = `開催日${index + 1}`;

    if (!day.dateLocal.trim()) {
      return { ok: false, error: `${label}の日付を入力してください` };
    }
    if (!day.startTimeLocal.trim()) {
      return { ok: false, error: `${label}の開始時刻を入力してください` };
    }
    if (!day.endTimeLocal.trim()) {
      return { ok: false, error: `${label}の終了時刻を入力してください` };
    }

    const startsAt = dateAndTimeJstToIso(day.dateLocal, day.startTimeLocal);
    const endsAt = dateAndTimeJstToIso(day.dateLocal, day.endTimeLocal);

    if (!startsAt) {
      return { ok: false, error: `${label}の日付・開始時刻が不正です` };
    }
    if (!endsAt) {
      return { ok: false, error: `${label}の終了時刻が不正です` };
    }
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return { ok: false, error: `${label}の終了時刻は開始時刻より後にしてください` };
    }

    days.push({ startsAt, endsAt });
  }

  days.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  return {
    ok: true,
    input: {
      eventType: state.eventType,
      format: state.format,
      location: state.location,
      capacity: state.capacity,
      registrationClosed: state.registrationClosed,
      published: state.published,
      adminNote: state.adminNote,
      scheduleNote: state.scheduleNote,
      feeNote: state.feeNote,
      archiveAvailable: state.archiveAvailable,
      days,
    },
  };
}

export function emptySessionDayFormState(): MelatoninYogaSessionDayFormState {
  return {
    clientKey: crypto.randomUUID(),
    dateLocal: "",
    startTimeLocal: "",
    endTimeLocal: "",
  };
}

export function emptySessionFormState(): MelatoninYogaSessionFormState {
  return {
    eventType: "consultation",
    days: [emptySessionDayFormState()],
    scheduleNote: "",
    feeNote: "",
    format: "online",
    location: "",
    capacity: 12,
    registrationClosed: false,
    published: false,
    archiveAvailable: false,
    adminNote: "",
  };
}
