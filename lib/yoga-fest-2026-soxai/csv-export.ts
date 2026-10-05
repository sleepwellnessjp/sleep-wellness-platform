import { ageBandForSoxaiCsv } from "@/lib/yoga-fest-2026-soxai/age-band-csv";
import { getYogaFest2026SoxaiClass } from "@/lib/yoga-fest-2026-soxai/classes";
import type { YogaFest2026SoxaiRegistrationRecord } from "@/lib/yoga-fest-2026-soxai/types";

const JST = "Asia/Tokyo";

function csvCell(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function formatClassDateTimeForCsv(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "—";
  const datePart = start.toLocaleDateString("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  const timePart = (iso: string) =>
    new Date(iso).toLocaleTimeString("ja-JP", {
      timeZone: JST,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  return `${datePart} ${timePart(startsAt)}〜${timePart(endsAt)}`;
}

export function buildYogaFestSoxaiRegistrationsCsv(
  registrations: readonly YogaFest2026SoxaiRegistrationRecord[],
): string {
  const header = [
    "メールアドレス",
    "クラスID",
    "先生",
    "クラス名",
    "日時",
    "年代",
  ].join(",");

  const rows = registrations.map((row) => {
    const session = getYogaFest2026SoxaiClass(row.classId);
    return [
      csvCell(row.email),
      csvCell(row.classId),
      csvCell(session.teacherName),
      csvCell(session.classTitle),
      csvCell(formatClassDateTimeForCsv(session.startsAt, session.endsAt)),
      csvCell(ageBandForSoxaiCsv(row.ageBand)),
    ].join(",");
  });

  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}
