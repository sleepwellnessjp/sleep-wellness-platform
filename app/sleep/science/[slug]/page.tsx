import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ScienceArticleBody, {
  ScienceMedicalNote,
} from "@/components/sleep-content/ScienceArticleBody";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import { getPublishedScienceArticleBySlug } from "@/lib/sleep-content/service";

type Params = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedScienceArticleBySlug(slug);
  if (!article) {
    return { title: "睡眠学" };
  }
  return {
    title: `${article.title} | 睡眠学`,
    description: article.summary.slice(0, 140) || article.title,
  };
}

export default async function SleepScienceArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = await getPublishedScienceArticleBySlug(slug);
  if (!article) notFound();

  return (
    <PublicIntroLayout
      eyebrow="SLEEP SCIENCE"
      title={article.title}
      lead={article.summary || "睡眠の基礎をわかりやすく解説します。"}
    >
      <ScienceArticleBody blocks={article.bodyBlocks} />
      <div className="max-w-2xl">
        <ScienceMedicalNote />
      </div>
    </PublicIntroLayout>
  );
}
