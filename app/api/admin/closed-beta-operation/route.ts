import { NextResponse } from "next/server";
import {
  getDemoClosedBetaOperationBundle,
  isBacklogStatus,
  isBugSeverity,
  isBugStatus,
  isFeatureRequestPriority,
  isFeatureRequestStatus,
} from "@/lib/closed-beta";
import type {
  BacklogStatus,
  BugSeverity,
  BugStatus,
  FeatureRequestPriority,
  FeatureRequestStatus,
} from "@/lib/closed-beta";
import {
  getClosedBetaOperationBundle,
  toBetaOperationAuthError,
  updateBacklogItemAdmin,
  updateBugReportAdmin,
  updateFeatureRequestAdmin,
} from "@/lib/closed-beta/beta-operation-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  updateDemoBacklogItem,
  updateDemoBugReport,
  updateDemoFeatureRequest,
} from "@/lib/closed-beta/demo-beta-operation-store";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        bundle: getDemoClosedBetaOperationBundle(),
        source: "demo",
      });
    }
    const bundle = await getClosedBetaOperationBundle();
    return NextResponse.json({ bundle, source: "live" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toBetaOperationAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

type PatchBody = {
  entity?: "feature_request" | "bug_report" | "product_backlog";
  id?: string;
  status?: string;
  priority?: string;
  severity?: string;
  plannedFor?: string | null;
  voteCount?: number;
};

export async function PATCH(request: Request) {
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (!body.id || !body.entity) {
    return NextResponse.json(
      { error: "対象が指定されていません" },
      { status: 400 },
    );
  }

  try {
    if (body.entity === "feature_request") {
      if (body.status !== undefined && !isFeatureRequestStatus(body.status)) {
        return NextResponse.json(
          { error: "要望ステータスが不正です" },
          { status: 400 },
        );
      }
      if (
        body.priority !== undefined &&
        !isFeatureRequestPriority(body.priority)
      ) {
        return NextResponse.json(
          { error: "優先度が不正です" },
          { status: 400 },
        );
      }

      const input = {
        id: body.id,
        status: body.status as FeatureRequestStatus | undefined,
        priority: body.priority as FeatureRequestPriority | undefined,
        plannedFor: body.plannedFor,
        voteCount: body.voteCount,
      };

      if (!isSupabaseConfigured()) {
        return NextResponse.json({
          featureRequest: updateDemoFeatureRequest(input),
        });
      }
      const featureRequest = await updateFeatureRequestAdmin(input);
      return NextResponse.json({ featureRequest });
    }

    if (body.entity === "bug_report") {
      if (body.status !== undefined && !isBugStatus(body.status)) {
        return NextResponse.json(
          { error: "不具合ステータスが不正です" },
          { status: 400 },
        );
      }
      if (body.severity !== undefined && !isBugSeverity(body.severity)) {
        return NextResponse.json(
          { error: "重要度が不正です" },
          { status: 400 },
        );
      }

      const input = {
        id: body.id,
        status: body.status as BugStatus | undefined,
        severity: body.severity as BugSeverity | undefined,
      };

      if (!isSupabaseConfigured()) {
        return NextResponse.json({
          bugReport: updateDemoBugReport(input),
        });
      }
      const bugReport = await updateBugReportAdmin(input);
      return NextResponse.json({ bugReport });
    }

    if (body.entity === "product_backlog") {
      if (body.status !== undefined && !isBacklogStatus(body.status)) {
        return NextResponse.json(
          { error: "バックログステータスが不正です" },
          { status: 400 },
        );
      }
      if (
        body.priority !== undefined &&
        !isFeatureRequestPriority(body.priority)
      ) {
        return NextResponse.json(
          { error: "優先度が不正です" },
          { status: 400 },
        );
      }

      const input = {
        id: body.id,
        status: body.status as BacklogStatus | undefined,
        priority: body.priority as FeatureRequestPriority | undefined,
      };

      if (!isSupabaseConfigured()) {
        return NextResponse.json({
          backlogItem: updateDemoBacklogItem(input),
        });
      }
      const backlogItem = await updateBacklogItemAdmin(input);
      return NextResponse.json({ backlogItem });
    }

    return NextResponse.json(
      { error: "エンティティが不正です" },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新に失敗しました";
    const mapped = toBetaOperationAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
