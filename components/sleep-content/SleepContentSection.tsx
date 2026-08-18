import { NAVY } from "@/components/ui/tokens";
import type { SleepContent } from "@/lib/sleep-content/types";

type Props = {
  title: string;
  items: SleepContent[];
  emptyMessage: string;
};

export default function SleepContentSection({ title, items, emptyMessage }: Props) {
  if (items.length === 0) {
    return (
      <section>
        <h2
          className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
          style={{ color: NAVY }}
        >
          {title}
        </h2>
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm leading-6 text-slate-500">{emptyMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2
        className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
        style={{ color: NAVY }}
      >
        {title}
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            {item.coverImageUrl && (
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold leading-snug" style={{ color: NAVY }}>
                {item.title}
              </h3>
              {item.summary && (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 line-clamp-2">
                  {item.summary}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
