import type { YogaFest2026SoxaiClass } from "@/lib/yoga-fest-2026-soxai/classes";

const JST = "Asia/Tokyo";

/** 2026-10-12 はスポーツの日（祝） */
const YOGA_FEST_2026_HOLIDAY_DATE_KEYS = new Set(["2026-10-12"]);

export function formatYogaFestClassDateHeading(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "—";
  const heading = date.toLocaleDateString("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  if (YOGA_FEST_2026_HOLIDAY_DATE_KEYS.has(yogaFestClassDateKey(startsAt))) {
    return heading.replace("(月)", "(月・祝)");
  }
  return heading;
}

function formatTimeJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("ja-JP", {
    timeZone: JST,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatYogaFestClassTimeRange(
  startsAt: string,
  endsAt: string,
): string {
  return `${formatTimeJst(startsAt)}〜${formatTimeJst(endsAt)}`;
}

export function yogaFestClassDateKey(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return startsAt;
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function groupYogaFestClassesByDate(
  classes: readonly YogaFest2026SoxaiClass[],
): Array<{ dateKey: string; heading: string; classes: YogaFest2026SoxaiClass[] }> {
  const groups: Array<{
    dateKey: string;
    heading: string;
    classes: YogaFest2026SoxaiClass[];
  }> = [];

  for (const item of classes) {
    const key = yogaFestClassDateKey(item.startsAt);
    const last = groups[groups.length - 1];
    if (last && last.dateKey === key) {
      last.classes.push(item);
    } else {
      groups.push({
        dateKey: key,
        heading: formatYogaFestClassDateHeading(item.startsAt),
        classes: [item],
      });
    }
  }

  return groups;
}
