import { NextResponse } from "next/server";
import {
  createMelatoninYogaRegistration,
  melatoninYogaRegistrationErrorStatus,
} from "@/lib/melatonin-yoga/registration-service";
import {
  clientIpFromRequest,
  validateMelatoninYogaRegistration,
} from "@/lib/melatonin-yoga/registration-validation";

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

  const parsed = validateMelatoninYogaRegistration(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const id = await createMelatoninYogaRegistration(
      parsed.value,
      clientIpFromRequest(request),
    );
    return NextResponse.json({ received: true, id });
  } catch (error) {
    const mapped = melatoninYogaRegistrationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
