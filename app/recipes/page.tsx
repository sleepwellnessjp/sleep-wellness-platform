import type { Metadata } from "next";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import RecipeCardGrid from "@/components/recipes/RecipeCardGrid";
import { listPublishedRecipes } from "@/lib/recipes/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "睡眠のための料理 | Sleep Wellness",
  description:
    'ヨガジャーナルなどでも紹介されているヨガ料理研究家TAKAのオリジナルレシピです。時間のない時でも気軽に作れる「時短レシピ」から本格的なカレーレシピまで！睡眠ウェルネススパイスを使った"睡眠を整える料理"が作れます。',
};

export default async function RecipesPage() {
  const recipes = await listPublishedRecipes();

  return (
    <PublicIntroLayout
      eyebrow="SLEEP RECIPE"
      title="睡眠のための料理"
      lead='ヨガジャーナルなどでも紹介されているヨガ料理研究家TAKAのオリジナルレシピです。時間のない時でも気軽に作れる「時短レシピ」から本格的なカレーレシピまで！睡眠ウェルネススパイスを使った"睡眠を整える料理"が作れます。'
      contentClassName="pb-[var(--sw-sleep-page-bottom-pad)] lg:pb-[5rem]"
    >
      <RecipeCardGrid
        recipes={recipes}
        emptyMessage="レシピを準備中です。公開までしばらくお待ちください。"
      />
    </PublicIntroLayout>
  );
}
