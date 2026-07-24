import type { ReactNode } from "react";
import PageTransition from "@/components/ui/PageTransition";

/** Remounts on navigation — enables calm SWIJ page transitions (v2.3). */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
