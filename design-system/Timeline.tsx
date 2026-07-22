import type { ReactNode } from "react";
import { GOLD, NAVY } from "./tokens";

export type TimelineItem = {
  id: string;
  title: string;
  description?: string;
  meta?: string;
  active?: boolean;
};

type Props = {
  items: TimelineItem[];
  empty?: ReactNode;
  className?: string;
};

/**
 * Timeline — vertical event / journey list.
 * Domain-heavy sleep timelines stay in modules/journey.
 */
export default function Timeline({ items, empty, className = "" }: Props) {
  if (items.length === 0) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-500 ${className}`}>
        {empty ?? "タイムラインがありません"}
      </div>
    );
  }

  return (
    <ol className={`space-y-0 ${className}`}>
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < items.length - 1 ? (
            <span
              className="absolute left-[7px] top-4 h-[calc(100%-8px)] w-px bg-slate-200"
              aria-hidden
            />
          ) : null}
          <span
            className={`relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
              item.active ? "border-transparent" : "border-slate-300 bg-white"
            }`}
            style={item.active ? { backgroundColor: GOLD } : undefined}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
                {item.title}
              </p>
              {item.meta ? (
                <span className="text-[11px] text-slate-500">{item.meta}</span>
              ) : null}
            </div>
            {item.description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
