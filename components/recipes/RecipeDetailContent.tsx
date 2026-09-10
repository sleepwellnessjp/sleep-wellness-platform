import Image from "next/image";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type { Recipe } from "@/lib/recipes/types";

export default function RecipeDetailContent({ recipe }: { recipe: Recipe }) {
  return (
    <article className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-sm text-slate-400">
            写真準備中
          </div>
        )}
      </div>

      <h1
        className="mt-8 text-[1.75rem] font-semibold tracking-[-0.04em] sm:text-[2rem]"
        style={{ color: NAVY }}
      >
        {recipe.title}
      </h1>

      {recipe.lead ? (
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-slate-600 sm:text-base sm:leading-8">
          {recipe.lead}
        </p>
      ) : null}

      {recipe.servings ? (
        <p className="mt-4 text-sm font-semibold" style={{ color: GOLD }}>
          {recipe.servings}
        </p>
      ) : null}

      {recipe.ingredientGroups.length > 0 ? (
        <section className="mt-10">
          <h2
            className="text-lg font-semibold tracking-[-0.02em]"
            style={{ color: NAVY }}
          >
            材料
          </h2>
          <div className="mt-4 space-y-6">
            {recipe.ingredientGroups.map((group, groupIndex) => (
              <div key={`group-${groupIndex}`}>
                {group.label ? (
                  <h3
                    className="text-sm font-semibold tracking-[0.04em]"
                    style={{ color: GOLD }}
                  >
                    {group.label}
                  </h3>
                ) : null}
                <ul
                  className={`space-y-2 ${group.label ? "mt-2" : ""}`}
                >
                  {group.items.map((item, itemIndex) => (
                    <li
                      key={`item-${groupIndex}-${itemIndex}`}
                      className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 text-[15px] text-[#071426]"
                    >
                      <span>{item.name}</span>
                      <span className="shrink-0 text-slate-500">{item.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {recipe.steps.length > 0 ? (
        <section className="mt-10">
          <h2
            className="text-lg font-semibold tracking-[-0.02em]"
            style={{ color: NAVY }}
          >
            作り方
          </h2>
          <ol className="mt-4 list-decimal space-y-4 pl-5 text-[15px] leading-7 text-[#071426] sm:leading-8">
            {recipe.steps.map((step, index) => (
              <li key={`step-${index}`} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {recipe.onePoint ? (
        <section className="mt-10 rounded-2xl border border-[#8a6a2d]/25 bg-[#fbf9f4] px-5 py-5">
          <h2
            className="text-sm font-semibold tracking-[0.12em]"
            style={{ color: GOLD }}
          >
            ワンポイント
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[#071426]">
            {recipe.onePoint}
          </p>
        </section>
      ) : null}

      <aside className="mt-12 border-t border-slate-200 pt-8">
        <div className="flex items-center gap-4">
          <Image
            src="/taka-profile.jpg"
            alt="若林貴久（TAKA）"
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded-full object-cover object-top"
          />
          <div className="min-w-0">
            <p
              className="text-[13px] font-semibold tracking-[-0.01em]"
              style={{ color: NAVY }}
            >
              監修 若林貴久（TAKA）
            </p>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              ヨガ料理研究家兼 睡眠ウェルネスプロデューサー
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3 text-[13px] leading-6 text-slate-600">
          <p>
            ヨガジャーナル日本版で連載を担当。「ヨガ料理人」として紹介され、アーユルヴェーダの智慧を食事に応用した料理の特集や、一週間の食事を追う企画などにたびたび登場している。
          </p>
          <p>
            睡眠ウェルネスヨガの第一人者として、ヨガフェスタ横浜2026ではSOXAIリングを用いた実証企画の監修を務める。
          </p>
          <p>
            Sleep Wellness Institute Japan
            代表、ニュートラルヨガ®︎創始者。共著に『かんたんお風呂ヨガ』。
          </p>
        </div>
      </aside>
    </article>
  );
}
