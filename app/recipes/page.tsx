import type { Metadata } from "next";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import RecipeCardGrid from "@/components/recipes/RecipeCardGrid";
import { listPublishedRecipes } from "@/lib/recipes/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "睡眠のための料理 | Sleep Wellness",
  description:
    "眠りを整える日常のひとつの選択肢として、料理のレシピをご紹介します。",
};

export default async function RecipesPage() {
  const recipes = await listPublishedRecipes();

  return (
    <PublicIntroLayout
      eyebrow="SLEEP RECIPE"
      title="睡眠のための料理"
      lead="眠りを整える日常のひとつの選択肢として、料理のレシピをご紹介します。"
      contentClassName="pb-[var(--sw-sleep-page-bottom-pad)] lg:pb-[5rem]"
    >
      <RecipeCardGrid
        recipes={recipes}
        emptyMessage="レシピを準備中です。公開までしばらくお待ちください。"
      />
    </PublicIntroLayout>
  );
}
