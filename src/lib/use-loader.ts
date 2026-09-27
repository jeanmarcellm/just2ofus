"use client";

import { useCallback, useEffect, useState } from "react";

// `fetcher` must be stable (module-level or memoized); it re-runs whenever its identity changes.
export function useLoader<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let active = true;
    fetcher().then((result) => {
      if (active) setData(result);
    });
    return () => {
      active = false;
    };
  }, [fetcher]);

  const reload = useCallback(async () => {
    setData(await fetcher());
  }, [fetcher]);

  return [data, reload] as const;
}
