import { NextResponse } from "next/server";
import {
  deleteYogaFest2026SoxaiRegistrationAsAdmin,
  listYogaFest2026SoxaiRegistrationsForAdmin,
  yogaFestSoxaiRegistrationErrorStatus,
} from "@/lib/yoga-fest-2026-soxai/registration-service";

export async function GET() {
  try {
    const registrations = await listYogaFest2026SoxaiRegistrationsForAdmin();
    return NextResponse.json({ registrations });
  } catch (error) {
    const mapped = yogaFestSoxaiRegistrationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (!body.id?.trim()) {
    return NextResponse.json(
      { error: "対象が指定されていません" },
      { status: 400 },
    );
  }

  try {
    await deleteYogaFest2026SoxaiRegistrationAsAdmin(body.id.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = yogaFestSoxaiRegistrationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
