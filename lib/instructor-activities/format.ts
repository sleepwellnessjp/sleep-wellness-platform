export function makeActivitySlug(title: string, eventDate: string): string {
  const datePart = (eventDate || "").trim() || "event";
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${datePart}-${base || "activity"}-${suffix}`;
}

/** Next.js の dynamic param が percent-encode されたまま渡る場合がある */
export function decodeActivitySlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export function activitySlugCandidates(slug: string): string[] {
  const trimmed = slug.trim();
  const decoded = decodeActivitySlug(trimmed);
  return [...new Set([decoded, trimmed].filter(Boolean))];
}

export function formatEventDateLabel(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) return isoDate.trim();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return isoDate.trim();
  return `${year}年${month}月${day}日`;
}

export function toTimeInputValue(value: string | null | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec((value ?? "").trim());
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function formatTimeLabel(value: string | null | undefined): string {
  const text = toTimeInputValue(value);
  if (!text) return "";
  const [hours, minutes] = text.split(":");
  return `${Number(hours)}:${minutes}`;
}

export function formatEventSchedule(activity: {
  eventDate: string;
  startTime?: string;
  endTime?: string;
}): string {
  const date = formatEventDateLabel(activity.eventDate);
  const start = formatTimeLabel(activity.startTime);
  const end = formatTimeLabel(activity.endTime);
  if (start && end) return `${date} ${start}〜${end}`;
  if (start) return `${date} ${start}〜`;
  return date;
}

export function composeLocation(region?: string, venue?: string): string {
  return [region, venue]
    .map((item) => (item ?? "").trim())
    .filter(Boolean)
    .join(" / ");
}

export function splitLocation(location: string): {
  region: string;
  venue: string;
} {
  const trimmed = location.trim();
  if (!trimmed) return { region: "", venue: "" };
  const separator = trimmed.includes(" / ") ? " / " : null;
  if (!separator) return { region: trimmed, venue: "" };
  const [region, ...rest] = trimmed.split(separator);
  return { region: (region ?? "").trim(), venue: rest.join(separator).trim() };
}

export function locationLabelOf(activity: {
  isOnline: boolean;
  location: string;
}): string {
  if (activity.isOnline) {
    const { region, venue } = splitLocation(activity.location);
    const extra = venue || region;
    return extra ? `オンライン（${extra}）` : "オンライン";
  }
  const { region, venue } = splitLocation(activity.location);
  if (region && venue) return `${region} / ${venue}`;
  return region || venue;
}

export function isUpcomingEventDate(
  isoDate: string,
  today = new Date(),
): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) return false;
  const event = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return event.getTime() >= start.getTime();
}
