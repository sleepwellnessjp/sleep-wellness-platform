import { NextResponse } from "next/server";
import { isYogaFest2026SoxaiClassId } from "@/lib/yoga-fest-2026-soxai/classes";
import { buildYogaFestSoxaiRegistrationsCsv } from "@/lib/yoga-fest-2026-soxai/csv-export";
import {
  listYogaFest2026SoxaiRegistrationsForAdmin,
  yogaFestSoxaiRegistrationErrorStatus,
} from "@/lib/yoga-fest-2026-soxai/registration-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classIdParam = searchParams.get("classId")?.trim() ?? "";

  try {
    let registrations = await listYogaFest2026SoxaiRegistrationsForAdmin();

    if (classIdParam && classIdParam !== "all") {
      if (!isYogaFest2026SoxaiClassId(classIdParam)) {
        return NextResponse.json(
          { error: "クラスが不正です" },
          { status: 400 },
        );
      }
      registrations = registrations.filter((row) => row.classId === classIdParam);
    }

    const csv = buildYogaFestSoxaiRegistrationsCsv(registrations);
    const suffix =
      classIdParam && classIdParam !== "all" ? classIdParam : "all";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="yoga-fest-soxai-${suffix}.csv"`,
      },
    });
  } catch (error) {
    const mapped = yogaFestSoxaiRegistrationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
