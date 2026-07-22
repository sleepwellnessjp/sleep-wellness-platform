"use client";

import { useEffect, useState } from "react";
import {
  getClientById,
  loadClients,
  type StoredClient,
} from "@/lib/repositories/client-repository";
import {
  errorState,
  idleState,
  loadingState,
  successState,
  type AsyncState,
} from "@/modules/_shared/async-state";

/**
 * Clients Module hook — list or single client by id.
 */
export function useClient(clientId?: string | null) {
  const [state, setState] = useState<AsyncState<StoredClient | StoredClient[]>>(
    idleState(),
  );

  useEffect(() => {
    let cancelled = false;
    setState(loadingState());

    void (async () => {
      try {
        if (clientId) {
          const client = await getClientById(clientId);
          if (!cancelled) {
            setState(
              client
                ? successState(client)
                : errorState("クライアントが見つかりません"),
            );
          }
          return;
        }
        const list = await loadClients();
        if (!cancelled) setState(successState(list));
      } catch (e) {
        if (!cancelled) {
          setState(
            errorState(e instanceof Error ? e.message : "読み込みに失敗しました"),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return state;
}
