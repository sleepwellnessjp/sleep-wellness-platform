import type { ReactNode } from "react";
import { CARD_CLASS, GOLD, NAVY } from "./tokens";

type Props = {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Shared section card shell — SWIJ brand (navy title / gold eyebrow / white surface). */
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
      className={`${CARD_CLASS} px-4 py-5 sm:px-6 sm:py-6 md:px-7 md:py-7 ${className}`}
    >
      {title || eyebrow ? (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--sw-border-subtle)] pb-3.5 sm:mb-5 sm:gap-3 sm:pb-4">
          {title ? (
            <h2
              className="min-w-0 break-words text-base font-semibold tracking-[-0.03em] sm:text-lg md:text-xl"
              style={{ color: NAVY }}
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {eyebrow ? (
            <p
              className="text-[10px] font-semibold tracking-[0.22em] sm:tracking-[0.28em]"
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
