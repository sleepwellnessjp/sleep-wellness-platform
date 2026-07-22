"use client";

import { useEffect, useState } from "react";
import type { CommunityDiscussionPost } from "@/lib/community/types";
import {
  errorState,
  idleState,
  loadingState,
  successState,
  type AsyncState,
} from "@/modules/_shared/async-state";

/**
 * Community Module hook — discussion posts from dashboard aggregate.
 */
export function useCommunity() {
  const [state, setState] = useState<AsyncState<CommunityDiscussionPost[]>>(
    idleState(),
  );

  useEffect(() => {
    let cancelled = false;
    setState(loadingState());

    void (async () => {
      try {
        const { loadCommunityDashboard } = await import(
          "@/lib/repositories/community-repository"
        );
        const dashboard = await loadCommunityDashboard();
        if (!cancelled) setState(successState(dashboard.discussions));
      } catch (e) {
        if (!cancelled) {
          setState(
            errorState(
              e instanceof Error ? e.message : "Community の取得に失敗しました",
            ),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
