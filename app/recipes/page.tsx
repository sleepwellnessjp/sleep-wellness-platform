import type { Metadata } from "next";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import RecipeCardGrid from "@/components/recipes/RecipeCardGrid";
import { listPublishedRecipes } from "@/lib/recipes/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "睡眠のための料理 | Sleep Wellness",
  description:
    "時間のない日でも作れる、短時間の料理です。消化に負担をかけず、眠りへ向かう身体を整えます。",
};

export default async function RecipesPage() {
  const recipes = await listPublishedRecipes();

  return (
    <PublicIntroLayout
      eyebrow="SLEEP RECIPE"
      title="睡眠のための料理"
      lead={
        "時間のない日でも作れる、短時間の料理です。\n消化に負担をかけず、眠りへ向かう身体を整えます。"
      }
      leadClassName="max-sm:-mx-2 max-sm:w-[calc(100%+1rem)] max-sm:max-w-none"
      contentClassName="pb-[var(--sw-sleep-page-bottom-pad)] lg:pb-[5rem]"
    >
      <RecipeCardGrid
        recipes={recipes}
        emptyMessage="レシピを準備中です。公開までしばらくお待ちください。"
      />
    </PublicIntroLayout>
  );
}
