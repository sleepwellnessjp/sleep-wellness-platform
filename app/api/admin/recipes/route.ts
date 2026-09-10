import { NextResponse } from "next/server";
import {
  createRecipeAsAdmin,
  listAllRecipesForAdmin,
} from "@/lib/recipes/service";
import type { RecipeInput } from "@/lib/recipes/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function errorStatus(message: string): number {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 400;
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const recipes = await listAllRecipesForAdmin();
    return NextResponse.json({ recipes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const body = (await request.json()) as { recipe?: RecipeInput };
    if (!body.recipe) {
      return NextResponse.json(
        { error: "レシピ内容がありません" },
        { status: 400 },
      );
    }
    const recipe = await createRecipeAsAdmin(body.recipe);
    return NextResponse.json({ recipe });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "レシピの登録に失敗しました";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
