import Link from "next/link";
import { NAVY } from "@/components/ui/tokens";
import type { Recipe } from "@/lib/recipes/types";

type Props = {
  recipes: Recipe[];
  emptyMessage: string;
};

export default function RecipeCardGrid({ recipes, emptyMessage }: Props) {
  if (recipes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p className="text-sm leading-6 text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link
            href={`/recipes/${recipe.id}`}
            className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-[#8a6a2d]/35"
          >
            <div className="aspect-[4/3] overflow-hidden bg-slate-100">
              {recipe.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  写真準備中
                </div>
              )}
            </div>
            <div className="p-4">
              <h2
                className="font-semibold leading-snug tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                {recipe.title}
              </h2>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
