"use client";

import { useEffect, useState } from "react";
import { ACADEMY_LESSONS } from "@/lib/academy/catalog";
import type { AcademyLesson } from "@/lib/academy/types";
import {
  idleState,
  successState,
  type AsyncState,
} from "@/modules/_shared/async-state";

/**
 * Academy Module hook — catalog snapshot (client-side).
 */
export function useAcademy() {
  const [state, setState] = useState<AsyncState<readonly AcademyLesson[]>>(
    idleState(),
  );

  useEffect(() => {
    setState(successState(ACADEMY_LESSONS));
  }, []);

  return state;
}
