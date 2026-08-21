/* useAsync — minimal data hook for the online-first admin screens.
   Runs an async fetch on mount and whenever `deps` change, tracks
   loading/error, and exposes `reload()`. Admin work assumes connectivity, so
   (unlike the technician side) it reads straight from the API rather than the
   offline mirror. ApiError network failures surface a friendly message. */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Hold the latest fetcher in a ref so callers can pass an inline closure
  // without it becoming an effect dependency.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(messageFor(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tick, ...deps]);

  return { data, loading, error, reload };
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    return err.isNetwork
      ? "Can't reach the server. Check your connection."
      : err.detail;
  }
  return "Something went wrong. Try again.";
}
