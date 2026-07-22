"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listClientHomeworks,
  type ClientHomework,
} from "@/lib/repositories/client-homeworks-repository";
import {
  errorState,
  idleState,
  loadingState,
  successState,
  type AsyncState,
} from "@/modules/_shared/async-state";

/**
 * Homework Module hook — list homework for a client.
 */
export function useHomework(clientId?: string | null) {
  const [state, setState] = useState<AsyncState<ClientHomework[]>>(idleState());

  const refresh = useCallback(async () => {
    if (!clientId) {
      setState(idleState());
      return;
    }
    setState(loadingState());
    try {
      const rows = await listClientHomeworks(clientId);
      setState(successState(rows));
    } catch (e) {
      setState(
        errorState(e instanceof Error ? e.message : "宿題の取得に失敗しました"),
      );
    }
  }, [clientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
