import { NextResponse } from "next/server";
import { isMelatoninYogaRegistrationStatus } from "@/lib/melatonin-yoga/registration-types";
import {
  listMelatoninYogaRegistrationsForAdmin,
  melatoninYogaRegistrationErrorStatus,
  updateMelatoninYogaRegistrationAsAdmin,
} from "@/lib/melatonin-yoga/registration-service";

export async function GET() {
  try {
    const registrations = await listMelatoninYogaRegistrationsForAdmin();
    return NextResponse.json({ registrations });
  } catch (error) {
    const mapped = melatoninYogaRegistrationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

type Body = {
  id?: string;
  status?: string;
  adminMemo?: string;
};

export async function PATCH(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (!body.id) {
    return NextResponse.json(
      { error: "対象が指定されていません" },
      { status: 400 },
    );
  }
  if (!body.status || !isMelatoninYogaRegistrationStatus(body.status)) {
    return NextResponse.json({ error: "状態が不正です" }, { status: 400 });
  }

  try {
    const registration = await updateMelatoninYogaRegistrationAsAdmin({
      id: body.id,
      status: body.status,
      adminMemo: typeof body.adminMemo === "string" ? body.adminMemo : "",
    });
    return NextResponse.json({ registration });
  } catch (error) {
    const mapped = melatoninYogaRegistrationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
