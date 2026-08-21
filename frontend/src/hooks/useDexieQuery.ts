/* useDexieQuery — run an async (IndexedDB) read and expose {data,loading,error}.
   Re-runs when `deps` change, so passing the sync store's pending/lastSyncedAt
   as deps refreshes lists after a sync or a local write. `reload()` forces it. */

import { useCallback, useEffect, useRef, useState } from "react";

interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

export function useDexieQuery<T>(
  query: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
): QueryState<T> & { reload: () => void } {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    loading: true,
    error: null,
  });
  // Keep the latest query without making it a dependency (it's a fresh closure
  // each render); we intentionally re-run only on `deps` / `nonce`.
  const queryRef = useRef(query);
  queryRef.current = query;
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    queryRef
      .current()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (alive)
          setState({
            data: undefined,
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load",
          });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload };
}
