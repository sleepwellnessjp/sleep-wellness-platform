import { NextResponse } from "next/server";
import {
  deleteRecipeAsAdmin,
  getRecipeByIdForAdmin,
  setRecipePublishedAsAdmin,
  updateRecipeAsAdmin,
} from "@/lib/recipes/service";
import type { RecipeInput } from "@/lib/recipes/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Params = { params: Promise<{ id: string }> };

function errorStatus(message: string): number {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 400;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const { id } = await params;
    const recipe = await getRecipeByIdForAdmin(id);
    if (!recipe) {
      return NextResponse.json(
        { error: "レシピが見つかりません" },
        { status: 404 },
      );
    }
    return NextResponse.json({ recipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const { id } = await params;
    const body = (await request.json()) as {
      recipe?: RecipeInput;
      isPublished?: boolean;
    };

    if (body.recipe) {
      const recipe = await updateRecipeAsAdmin(id, body.recipe);
      return NextResponse.json({ recipe });
    }

    if (typeof body.isPublished === "boolean") {
      const recipe = await setRecipePublishedAsAdmin(id, body.isPublished);
      return NextResponse.json({ recipe });
    }

    return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const { id } = await params;
    await deleteRecipeAsAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
