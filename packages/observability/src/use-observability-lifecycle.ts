import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';

import { watchUserIdentity } from './user-identity';

interface ObservabilityHandlers {
  init: () => void;
  identify: (userId: string) => void;
}

export function useObservabilityLifecycle<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  { init, identify }: ObservabilityHandlers,
) {
  const queryKeyHash = JSON.stringify(queryKey);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(
    () => watchUserIdentity<T>(queryClient, queryKey, identify),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, queryKeyHash, identify],
  );
}
