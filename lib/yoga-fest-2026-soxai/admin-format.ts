import { getYogaFest2026SoxaiClass } from "@/lib/yoga-fest-2026-soxai/classes";
import {
  formatYogaFestClassDateHeading,
  formatYogaFestClassTimeRange,
} from "@/lib/yoga-fest-2026-soxai/format";
import type { YogaFest2026SoxaiClassId } from "@/lib/yoga-fest-2026-soxai/classes";

export function formatYogaFestSoxaiClassSummary(classId: YogaFest2026SoxaiClassId): {
  heading: string;
  detail: string;
} {
  const session = getYogaFest2026SoxaiClass(classId);
  return {
    heading: `${session.teacherName}「${session.classTitle}」`,
    detail: `${formatYogaFestClassDateHeading(session.startsAt)} ${formatYogaFestClassTimeRange(session.startsAt, session.endsAt)} ／ ${session.room}`,
  };
}

export function formatYogaFestSoxaiSubmittedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
