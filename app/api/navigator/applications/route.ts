import { NextResponse } from "next/server";
import {
  createNavigatorApplication,
  navigatorApplicationErrorStatus,
} from "@/lib/navigator/application-service";
import {
  clientIpFromRequest,
  validateNavigatorApplication,
} from "@/lib/navigator/application-validation";

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

  const parsed = validateNavigatorApplication(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await createNavigatorApplication(
      parsed.value,
      clientIpFromRequest(request),
    );
    return NextResponse.json({ received: true });
  } catch (error) {
    const mapped = navigatorApplicationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
