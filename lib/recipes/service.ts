import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  RECIPE_IMAGE_BUCKET,
  parseIngredientGroups,
  parseSteps,
  type Recipe,
  type RecipeIngredientGroup,
  type RecipeInput,
  type RecipeRow,
} from "@/lib/recipes/types";

type Client = SupabaseClient<Database>;

const RECIPE_SELECT = `
  id, title, lead, servings, image_path, ingredient_groups, steps,
  one_point, is_published, sort_order, created_at, updated_at
`;

function recipesFrom(client: Client) {
  return client.from("recipes");
}

async function requireClient(): Promise<Client> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase が設定されていません");
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

function isMissingTable(message: string): boolean {
  return /Could not find the table ['"]?public\.recipes|relation ["']recipes["'] does not exist/i.test(
    message,
  );
}

function missingTableError(error: { message: string }): never {
  if (isMissingTable(error.message)) {
    throw new Error(
      "レシピのデータベースが未設定です。supabase/migrations/20260910120000_recipes.sql を実行してください。",
    );
  }
  throw new Error(error.message);
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function publicImageUrl(supabase: Client, path: string): string {
  const cleaned = text(path);
  if (!cleaned) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  const { data } = supabase.storage.from(RECIPE_IMAGE_BUCKET).getPublicUrl(cleaned);
  return data.publicUrl;
}

function sanitizeIngredientGroups(
  groups: RecipeIngredientGroup[] | undefined,
): RecipeIngredientGroup[] {
  return (groups ?? [])
    .map((group) => {
      const label = text(group.label);
      const items = (group.items ?? [])
        .map((item) => ({
          name: text(item.name),
          amount: text(item.amount),
        }))
        .filter((item) => item.name || item.amount);
      if (!label && items.length === 0) return null;
      return label ? { label, items } : { items };
    })
    .filter((group): group is RecipeIngredientGroup => group != null);
}

function sanitizeSteps(steps: string[] | undefined): string[] {
  return (steps ?? []).map((step) => text(step)).filter(Boolean);
}

function mapRecipe(row: RecipeRow, supabase: Client): Recipe {
  const imagePath = text(row.image_path);
  return {
    id: row.id,
    title: text(row.title),
    lead: text(row.lead),
    servings: text(row.servings),
    imagePath,
    imageUrl: publicImageUrl(supabase, imagePath),
    ingredientGroups: parseIngredientGroups(row.ingredient_groups),
    steps: parseSteps(row.steps),
    onePoint: text(row.one_point),
    isPublished: Boolean(row.is_published),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fieldsFromInput(input: RecipeInput): Record<string, unknown> {
  const title = text(input.title);
  if (!title) throw new Error("料理名を入力してください");

  const sortOrder =
    typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
      ? Math.trunc(input.sortOrder)
      : 0;

  const imagePath = text(input.imagePath);
  const ingredientGroups = sanitizeIngredientGroups(input.ingredientGroups);
  const steps = sanitizeSteps(input.steps);

  return {
    title,
    lead: text(input.lead) || null,
    servings: text(input.servings) || null,
    image_path: imagePath || null,
    ingredient_groups: ingredientGroups as unknown as Json,
    steps: steps as unknown as Json,
    one_point: text(input.onePoint) || null,
    is_published: Boolean(input.isPublished),
    sort_order: sortOrder,
  };
}

export async function listAllRecipesForAdmin(): Promise<Recipe[]> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const { data, error } = await recipesFrom(supabase)
    .select(RECIPE_SELECT)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[recipes] listAll:", error.message);
    missingTableError(error);
  }
  return ((data as unknown as RecipeRow[]) ?? []).map((row) =>
    mapRecipe(row, supabase),
  );
}

async function getRowById(
  id: string,
  supabase: Client,
): Promise<Recipe | null> {
  const { data, error } = await recipesFrom(supabase)
    .select(RECIPE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) missingTableError(error);
  if (!data) return null;
  return mapRecipe(data as unknown as RecipeRow, supabase);
}

export async function getRecipeByIdForAdmin(id: string): Promise<Recipe | null> {
  await requireAdminProfile();
  const supabase = await requireClient();
  return getRowById(id, supabase);
}

export async function createRecipeAsAdmin(input: RecipeInput): Promise<Recipe> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const payload = fieldsFromInput(input);
  const { data, error } = await recipesFrom(supabase)
    .insert(payload as never)
    .select(RECIPE_SELECT)
    .single();
  if (error) missingTableError(error);
  if (!data) throw new Error("レシピの登録に失敗しました");
  return mapRecipe(data as unknown as RecipeRow, supabase);
}

export async function updateRecipeAsAdmin(
  id: string,
  input: RecipeInput,
): Promise<Recipe> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getRowById(id, supabase);
  if (!existing) throw new Error("レシピが見つかりません");

  const payload = fieldsFromInput(input);
  const { data, error } = await recipesFrom(supabase)
    .update(payload as never)
    .eq("id", id)
    .select(RECIPE_SELECT)
    .single();
  if (error) missingTableError(error);
  if (!data) throw new Error("レシピの更新に失敗しました");
  return mapRecipe(data as unknown as RecipeRow, supabase);
}

export async function setRecipePublishedAsAdmin(
  id: string,
  isPublished: boolean,
): Promise<Recipe> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const { data, error } = await recipesFrom(supabase)
    .update({ is_published: isPublished } as never)
    .eq("id", id)
    .select(RECIPE_SELECT)
    .single();
  if (error) missingTableError(error);
  if (!data) throw new Error("公開状態の更新に失敗しました");
  return mapRecipe(data as unknown as RecipeRow, supabase);
}

export async function deleteRecipeAsAdmin(id: string): Promise<void> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const { error } = await recipesFrom(supabase).delete().eq("id", id);
  if (error) missingTableError(error);
}
