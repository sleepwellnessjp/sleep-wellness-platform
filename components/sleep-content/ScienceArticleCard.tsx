import Link from "next/link";
import { NAVY } from "@/components/ui/tokens";
import type { SleepContent } from "@/lib/sleep-content/types";

export default function ScienceArticleCard({
  article,
}: {
  article: SleepContent;
}) {
  return (
    <article className="min-w-0">
      <Link
        href={`/sleep/science/${article.slug}`}
        className="group flex aspect-[3/4] flex-col overflow-hidden rounded-2xl"
        style={{ backgroundColor: NAVY }}
      >
        <div className="relative min-h-0 flex-[65] overflow-hidden">
          {article.coverImageUrl ? (
            <img
              src={article.coverImageUrl}
              alt=""
              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
            style={{
              background: `linear-gradient(to bottom, transparent, ${NAVY})`,
            }}
          />
        </div>
        <div className="flex min-h-0 flex-[35] flex-col items-center justify-center px-4 pb-4 text-center sm:px-5">
          <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-white">
            {article.title}
          </h3>
          {article.summary ? (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-white/75">
              {article.summary}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
