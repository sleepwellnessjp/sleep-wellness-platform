import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Soft page enter — used by `app/template.tsx` so route changes feel calm
 * without altering page logic. Honors prefers-reduced-motion via globals.css.
 */
export default function PageTransition({ children, className = "" }: Props) {
  return (
    <div className={`sw-page-enter ${className}`.trim()}>{children}</div>
  );
}
