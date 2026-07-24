import { NextResponse } from "next/server";
import {
  getDemoHqOpsDashboard,
  getDemoInstructorOpsDashboard,
  listDemoCertificationLevels,
  listDemoCertifiedInstructors,
  listDemoOpsNotifications,
  listDemoSchools,
  publishDemoOpsNotification,
  updateDemoCertificationLevel,
  updateDemoInstructorOps,
  upsertDemoSchool,
  getDemoSchoolDetail,
} from "@/lib/ops/demo-ops-store";
import {
  getHqOpsDashboard,
  getInstructorOpsDashboard,
  listCertificationLevels,
  listCertifiedInstructors,
  listOpsNotifications,
  listSchools,
  getSchoolDetail,
  publishOpsNotification,
  toJapaneseAuthError,
  updateCertificationLevel,
  updateInstructorOps,
  upsertSchool,
} from "@/lib/ops/ops-service";
import type {
  InstructorOpsAction,
  OpsNotificationKind,
  PublishOpsNotificationInput,
  SchoolStatus,
  UpdateInstructorOpsInput,
  UpdateLevelInput,
  UpsertSchoolInput,
} from "@/lib/ops/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Resource =
  | "hq"
  | "instructor-dashboard"
  | "schools"
  | "school"
  | "instructors"
  | "levels"
  | "notifications";

function resourceOf(request: Request): Resource {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get("resource") ?? "hq";
  if (
    value === "hq" ||
    value === "instructor-dashboard" ||
    value === "schools" ||
    value === "school" ||
    value === "instructors" ||
    value === "levels" ||
    value === "notifications"
  ) {
    return value;
  }
  return "hq";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resource = resourceOf(request);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const levelId = searchParams.get("levelId") ?? "all";
  const schoolId = searchParams.get("schoolId") ?? searchParams.get("id") ?? "";
  const kind = searchParams.get("kind") ?? "all";

  try {
    if (!isSupabaseConfigured()) {
      switch (resource) {
        case "hq":
          return NextResponse.json({ dashboard: getDemoHqOpsDashboard() });
        case "instructor-dashboard":
          return NextResponse.json({
            dashboard: getDemoInstructorOpsDashboard(),
          });
        case "schools":
          return NextResponse.json({ schools: listDemoSchools(q) });
        case "school": {
          const detail = getDemoSchoolDetail(schoolId);
          if (!detail) {
            return NextResponse.json(
              { error: "認定校が見つかりません" },
              { status: 404 },
            );
          }
          return NextResponse.json({ detail });
        }
        case "instructors":
          return NextResponse.json({
            instructors: listDemoCertifiedInstructors({
              q,
              status,
              levelId,
              schoolId: schoolId || "all",
            }),
          });
        case "levels":
          return NextResponse.json({ levels: listDemoCertificationLevels() });
        case "notifications":
          return NextResponse.json({
            notifications: listDemoOpsNotifications(kind),
          });
      }
    }

    switch (resource) {
      case "hq":
        return NextResponse.json({ dashboard: await getHqOpsDashboard() });
      case "instructor-dashboard":
        return NextResponse.json({
          dashboard: await getInstructorOpsDashboard(),
        });
      case "schools":
        return NextResponse.json({ schools: await listSchools(q) });
      case "school": {
        const detail = await getSchoolDetail(schoolId);
        if (!detail) {
          return NextResponse.json(
            { error: "認定校が見つかりません" },
            { status: 404 },
          );
        }
        return NextResponse.json({ detail });
      }
      case "instructors":
        return NextResponse.json({
          instructors: await listCertifiedInstructors({
            q,
            status,
            levelId,
            schoolId: schoolId || "all",
          }),
        });
      case "levels":
        return NextResponse.json({ levels: await listCertificationLevels() });
      case "notifications":
        return NextResponse.json({
          notifications: await listOpsNotifications(kind),
        });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

export async function POST(request: Request) {
  const resource = resourceOf(request);

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!isSupabaseConfigured()) {
      if (resource === "schools") {
        const input: UpsertSchoolInput = {
          id: typeof body.id === "string" ? body.id : undefined,
          code: String(body.code ?? ""),
          name: String(body.name ?? ""),
          nameKana: typeof body.nameKana === "string" ? body.nameKana : "",
          region: typeof body.region === "string" ? body.region : "",
          prefecture:
            typeof body.prefecture === "string" ? body.prefecture : "",
          address: typeof body.address === "string" ? body.address : "",
          representativeName:
            typeof body.representativeName === "string"
              ? body.representativeName
              : "",
          contactEmail:
            typeof body.contactEmail === "string" ? body.contactEmail : "",
          contactPhone:
            typeof body.contactPhone === "string" ? body.contactPhone : "",
          status: (body.status as SchoolStatus | undefined) ?? "active",
          certifiedAt:
            typeof body.certifiedAt === "string" ? body.certifiedAt : undefined,
          adminMemo: typeof body.adminMemo === "string" ? body.adminMemo : "",
        };
        if (!input.code || !input.name) {
          return NextResponse.json(
            { error: "コードと名称は必須です" },
            { status: 400 },
          );
        }
        return NextResponse.json({ school: upsertDemoSchool(input) });
      }

      if (resource === "notifications") {
        const input: PublishOpsNotificationInput = {
          kind: body.kind as OpsNotificationKind,
          title: String(body.title ?? ""),
          body: String(body.body ?? ""),
          href: typeof body.href === "string" ? body.href : null,
          isPinned: Boolean(body.isPinned),
          audience:
            (body.audience as PublishOpsNotificationInput["audience"]) ??
            "all_instructors",
        };
        if (!input.kind || !input.title) {
          return NextResponse.json(
            { error: "種別とタイトルは必須です" },
            { status: 400 },
          );
        }
        return NextResponse.json({
          notification: publishDemoOpsNotification(input),
        });
      }

      return NextResponse.json({ error: "未対応の操作です" }, { status: 400 });
    }

    if (resource === "schools") {
      const input: UpsertSchoolInput = {
        id: typeof body.id === "string" ? body.id : undefined,
        code: String(body.code ?? ""),
        name: String(body.name ?? ""),
        nameKana: typeof body.nameKana === "string" ? body.nameKana : "",
        region: typeof body.region === "string" ? body.region : "",
        prefecture: typeof body.prefecture === "string" ? body.prefecture : "",
        address: typeof body.address === "string" ? body.address : "",
        representativeName:
          typeof body.representativeName === "string"
            ? body.representativeName
            : "",
        contactEmail:
          typeof body.contactEmail === "string" ? body.contactEmail : "",
        contactPhone:
          typeof body.contactPhone === "string" ? body.contactPhone : "",
        status: (body.status as SchoolStatus | undefined) ?? "active",
        certifiedAt:
          typeof body.certifiedAt === "string" ? body.certifiedAt : undefined,
        adminMemo: typeof body.adminMemo === "string" ? body.adminMemo : "",
      };
      if (!input.code || !input.name) {
        return NextResponse.json(
          { error: "コードと名称は必須です" },
          { status: 400 },
        );
      }
      return NextResponse.json({ school: await upsertSchool(input) });
    }

    if (resource === "notifications") {
      const input: PublishOpsNotificationInput = {
        kind: body.kind as OpsNotificationKind,
        title: String(body.title ?? ""),
        body: String(body.body ?? ""),
        href: typeof body.href === "string" ? body.href : null,
        isPinned: Boolean(body.isPinned),
        audience:
          (body.audience as PublishOpsNotificationInput["audience"]) ??
          "all_instructors",
      };
      if (!input.kind || !input.title) {
        return NextResponse.json(
          { error: "種別とタイトルは必須です" },
          { status: 400 },
        );
      }
      return NextResponse.json({
        notification: await publishOpsNotification(input),
      });
    }

    return NextResponse.json({ error: "未対応の操作です" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "処理に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

function parseUsageStartDate(
  value: unknown,
): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

export async function PATCH(request: Request) {
  const resource = resourceOf(request);

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!isSupabaseConfigured()) {
      if (resource === "instructors") {
        const input: UpdateInstructorOpsInput = {
          id: String(body.id ?? ""),
          action: body.action as InstructorOpsAction,
          levelId: typeof body.levelId === "string" ? body.levelId : undefined,
          schoolId:
            body.schoolId === null
              ? null
              : typeof body.schoolId === "string"
                ? body.schoolId
                : undefined,
          renewsAt:
            typeof body.renewsAt === "string" ? body.renewsAt : undefined,
          usageStartDate: parseUsageStartDate(body.usageStartDate),
          note: typeof body.note === "string" ? body.note : undefined,
          adminMemo:
            typeof body.adminMemo === "string" ? body.adminMemo : undefined,
        };
        if (!input.id || !input.action) {
          return NextResponse.json(
            { error: "id と action は必須です" },
            { status: 400 },
          );
        }
        return NextResponse.json({
          instructor: updateDemoInstructorOps(input),
        });
      }

      if (resource === "levels") {
        const input: UpdateLevelInput = {
          id: String(body.id ?? ""),
          label: typeof body.label === "string" ? body.label : undefined,
          description:
            typeof body.description === "string" ? body.description : undefined,
          renewalMonths:
            typeof body.renewalMonths === "number"
              ? body.renewalMonths
              : undefined,
          ceHoursRequired:
            typeof body.ceHoursRequired === "number"
              ? body.ceHoursRequired
              : undefined,
          isActive:
            typeof body.isActive === "boolean" ? body.isActive : undefined,
        };
        if (!input.id) {
          return NextResponse.json({ error: "id は必須です" }, { status: 400 });
        }
        return NextResponse.json({
          level: updateDemoCertificationLevel(input),
        });
      }

      return NextResponse.json({ error: "未対応の操作です" }, { status: 400 });
    }

    if (resource === "instructors") {
      const input: UpdateInstructorOpsInput = {
        id: String(body.id ?? ""),
        action: body.action as InstructorOpsAction,
        levelId: typeof body.levelId === "string" ? body.levelId : undefined,
        schoolId:
          body.schoolId === null
            ? null
            : typeof body.schoolId === "string"
              ? body.schoolId
              : undefined,
        renewsAt: typeof body.renewsAt === "string" ? body.renewsAt : undefined,
        usageStartDate: parseUsageStartDate(body.usageStartDate),
        note: typeof body.note === "string" ? body.note : undefined,
        adminMemo:
          typeof body.adminMemo === "string" ? body.adminMemo : undefined,
      };
      if (!input.id || !input.action) {
        return NextResponse.json(
          { error: "id と action は必須です" },
          { status: 400 },
        );
      }
      return NextResponse.json({
        instructor: await updateInstructorOps(input),
      });
    }

    if (resource === "levels") {
      const input: UpdateLevelInput = {
        id: String(body.id ?? ""),
        label: typeof body.label === "string" ? body.label : undefined,
        description:
          typeof body.description === "string" ? body.description : undefined,
        renewalMonths:
          typeof body.renewalMonths === "number"
            ? body.renewalMonths
            : undefined,
        ceHoursRequired:
          typeof body.ceHoursRequired === "number"
            ? body.ceHoursRequired
            : undefined,
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      };
      if (!input.id) {
        return NextResponse.json({ error: "id は必須です" }, { status: 400 });
      }
      return NextResponse.json({
        level: await updateCertificationLevel(input),
      });
    }

    return NextResponse.json({ error: "未対応の操作です" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "処理に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}
