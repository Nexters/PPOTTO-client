import { watchUserIdentity } from '@ppotto/observability';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { userApi } from '@/entities/user/api/user-api';
import { userQueryKeys } from '@/entities/user/api/user-query-keys';

import { identifyUser, initObservability } from './observability';

type Me = Awaited<ReturnType<typeof userApi.getMe>>;

export function useObservability(queryClient: QueryClient) {
  useEffect(() => {
    initObservability();
  }, []);

  useEffect(
    () => watchUserIdentity<Me>(queryClient, userQueryKeys.me(), identifyUser),
    [queryClient],
  );
}
