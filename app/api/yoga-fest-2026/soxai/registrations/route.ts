import { NextResponse } from "next/server";
import {
  createYogaFest2026SoxaiRegistration,
  yogaFestSoxaiRegistrationErrorStatus,
} from "@/lib/yoga-fest-2026-soxai/registration-service";
import {
  clientIpFromRequest,
  validateYogaFest2026SoxaiRegistration,
} from "@/lib/yoga-fest-2026-soxai/registration-validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  const parsed = validateYogaFest2026SoxaiRegistration(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const id = await createYogaFest2026SoxaiRegistration(
      parsed.value,
      clientIpFromRequest(request),
    );
    return NextResponse.json({ received: true, id });
  } catch (error) {
    const mapped = yogaFestSoxaiRegistrationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
