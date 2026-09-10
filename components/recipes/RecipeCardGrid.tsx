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
    <ul className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {recipes.map((recipe) => (
        <li key={recipe.id} className="min-w-0">
          <Link
            href={`/recipes/${recipe.id}`}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-[#8a6a2d]/35"
          >
            <div className="aspect-[4/3] shrink-0 overflow-hidden bg-slate-100">
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
            <div className="flex min-h-[4.5rem] flex-1 flex-col px-3 pb-3 pt-2.5 md:min-h-[5rem] md:px-4 md:pb-4 md:pt-3">
              <h2
                className="mt-auto text-left text-[15px] font-semibold tracking-[-0.02em]"
                style={{
                  color: NAVY,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
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
