export const RECIPE_IMAGE_BUCKET = "recipe-images";
export const RECIPE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const RECIPE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export type RecipeIngredientItem = {
  name: string;
  amount: string;
};

export type RecipeIngredientGroup = {
  /** 省略可（グループ名なしの材料ブロック） */
  label?: string;
  items: RecipeIngredientItem[];
};

export type RecipeRow = {
  id: string;
  title: string;
  lead: string | null;
  servings: string | null;
  image_path: string | null;
  ingredient_groups: unknown;
  steps: unknown;
  one_point: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Recipe = {
  id: string;
  title: string;
  lead: string;
  servings: string;
  imagePath: string;
  /** Storage 公開 URL（プレビュー用。DB には持たない） */
  imageUrl: string;
  ingredientGroups: RecipeIngredientGroup[];
  steps: string[];
  onePoint: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RecipeInput = {
  title: string;
  lead?: string;
  servings?: string;
  imagePath?: string;
  ingredientGroups?: RecipeIngredientGroup[];
  steps?: string[];
  onePoint?: string;
  isPublished?: boolean;
  sortOrder?: number;
};

export function parseIngredientGroups(value: unknown): RecipeIngredientGroup[] {
  if (!Array.isArray(value)) return [];
  return value.map((group) => {
    const raw =
      group && typeof group === "object"
        ? (group as Record<string, unknown>)
        : {};
    const label =
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim()
        : undefined;
    const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
    const items = itemsRaw.map((item) => {
      const row =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      return {
        name: typeof row.name === "string" ? row.name : "",
        amount: typeof row.amount === "string" ? row.amount : "",
      };
    });
    return label ? { label, items } : { items };
  });
}

export function parseSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((step) => (typeof step === "string" ? step : ""));
}
