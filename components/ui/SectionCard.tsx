import type { ReactNode } from "react";
import { GOLD, NAVY } from "./tokens";

type Props = {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Shared section card shell used across client / instructor surfaces. */
export default function SectionCard({
  eyebrow,
  title,
  children,
  className = "",
  id,
}: Props) {
  return (
    <section
      id={id}
      className={`rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-7 sm:py-7 ${className}`}
    >
      {title || eyebrow ? (
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
          {title ? (
            <h2
              className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
              style={{ color: NAVY }}
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {eyebrow ? (
            <p
              className="text-[10px] font-semibold tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              {eyebrow}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
