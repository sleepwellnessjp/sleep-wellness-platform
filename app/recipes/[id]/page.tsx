import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeDetailContent from "@/components/recipes/RecipeDetailContent";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/site/SiteHeader";
import { NAVY } from "@/components/ui/tokens";
import { getPublishedRecipeById } from "@/lib/recipes/service";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getPublishedRecipeById(id);
  if (!recipe) {
    return { title: "睡眠のための料理" };
  }
  return {
    title: `${recipe.title} | 睡眠のための料理`,
    description: recipe.lead.slice(0, 140) || recipe.title,
  };
}

export default async function RecipeDetailPage({ params }: Params) {
  const { id } = await params;
  const recipe = await getPublishedRecipeById(id);
  if (!recipe) notFound();

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#071426]">
      <SiteHeader
        actions={
          <Link
            href="/contact"
            className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold text-white transition hover:opacity-90 sm:text-sm"
            style={{ background: NAVY }}
          >
            お問い合わせ
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16 pb-[var(--sw-sleep-page-bottom-pad)] lg:pb-[5rem]">
        <p className="mb-6">
          <Link
            href="/recipes"
            className="text-sm font-semibold text-slate-500 transition hover:text-[#071426]"
          >
            ← 睡眠のための料理
          </Link>
        </p>
        <RecipeDetailContent recipe={recipe} />
      </div>

      <section className="border-t border-[rgba(7,20,38,0.06)] bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
          <h2
            className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            ご相談・お問い合わせ
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            開催予定や受講・参加のご相談は、お気軽にお問い合わせください。
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: NAVY }}
          >
            お問い合わせ
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
