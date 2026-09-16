import { NextResponse } from "next/server";
import {
  getInstructorProfileById,
  updateInstructorProfileAsAdmin,
} from "@/lib/instructors/instructor-profile-service";
import {
  deleteInstructorProfilePhotos,
  INSTRUCTOR_PHOTO_ACCOUNT_UNLINKED_ERROR,
  uploadInstructorProfilePhoto,
} from "@/lib/instructors/profile-photo-storage";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type RouteContext = { params: Promise<{ id: string }> };

function mapAuthError(error: unknown): NextResponse | null {
  const message = error instanceof Error ? error.message : "";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (message === "Forbidden") {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }
  return null;
}

function statusForPhotoError(message: string): number {
  if (message === INSTRUCTOR_PHOTO_ACCOUNT_UNLINKED_ERROR) return 409;
  if (
    message.includes("対応形式") ||
    message.includes("大きすぎます") ||
    message.includes("画像ファイル")
  ) {
    return 400;
  }
  if (message.includes("見つかりません")) return 404;
  return 500;
}

/** 詳細用: 現在の写真 URL とアカウント連携状態 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    await requireAdminProfile();

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const { id: instructorId } = await context.params;
    if (!instructorId?.trim()) {
      return NextResponse.json(
        { error: "講師 ID が必要です" },
        { status: 400 },
      );
    }

    const current = await getInstructorProfileById(instructorId, supabase);
    if (!current) {
      return NextResponse.json(
        { error: "認定講師が見つかりません" },
        { status: 404 },
      );
    }

    const userId = (current.userId ?? "").trim();
    return NextResponse.json({
      instructorId: current.id,
      userId: userId || null,
      accountLinked: Boolean(userId),
      profileImageUrl: current.profileImageUrl,
    });
  } catch (error) {
    const auth = mapAuthError(error);
    if (auth) return auth;
    console.error("[api/admin/certified-instructors/[id]/photo GET]", error);
    const message =
      error instanceof Error ? error.message : "写真情報の取得に失敗しました";
    return NextResponse.json(
      { error: message },
      { status: statusForPhotoError(message) },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    await requireAdminProfile();

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const { id: instructorId } = await context.params;
    if (!instructorId?.trim()) {
      return NextResponse.json(
        { error: "講師 ID が必要です" },
        { status: 400 },
      );
    }

    const current = await getInstructorProfileById(instructorId, supabase);
    if (!current) {
      return NextResponse.json(
        { error: "認定講師が見つかりません" },
        { status: 404 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "画像ファイルを指定してください" },
        { status: 400 },
      );
    }

    const { url } = await uploadInstructorProfilePhoto({
      supabase,
      ownerUserId: current.userId,
      file,
    });

    const profile = await updateInstructorProfileAsAdmin(
      instructorId,
      { profileImageUrl: url },
      supabase,
    );

    return NextResponse.json({ profile, url });
  } catch (error) {
    const auth = mapAuthError(error);
    if (auth) return auth;
    console.error("[api/admin/certified-instructors/[id]/photo POST]", error);
    const message =
      error instanceof Error
        ? error.message
        : "写真のアップロードに失敗しました";
    return NextResponse.json(
      { error: message },
      { status: statusForPhotoError(message) },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    await requireAdminProfile();

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const { id: instructorId } = await context.params;
    if (!instructorId?.trim()) {
      return NextResponse.json(
        { error: "講師 ID が必要です" },
        { status: 400 },
      );
    }

    const current = await getInstructorProfileById(instructorId, supabase);
    if (!current) {
      return NextResponse.json(
        { error: "認定講師が見つかりません" },
        { status: 404 },
      );
    }

    await deleteInstructorProfilePhotos({
      supabase,
      ownerUserId: current.userId,
    });

    const profile = await updateInstructorProfileAsAdmin(
      instructorId,
      { profileImageUrl: null },
      supabase,
    );

    return NextResponse.json({ profile });
  } catch (error) {
    const auth = mapAuthError(error);
    if (auth) return auth;
    console.error(
      "[api/admin/certified-instructors/[id]/photo DELETE]",
      error,
    );
    const message =
      error instanceof Error ? error.message : "写真の削除に失敗しました";
    return NextResponse.json(
      { error: message },
      { status: statusForPhotoError(message) },
    );
  }
}
