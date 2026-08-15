'use client';

import { watchUserIdentity } from '@ppotto/observability';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { userApi } from '@/entities/user/api/user-api';
import { userQueryKeys } from '@/entities/user/api/user-query-keys';
import { identifyUser, initObservability } from '@/shared/lib/observability';

type Me = Awaited<ReturnType<typeof userApi.getMe>>;

export function ObservabilityProvider() {
  const queryClient = useQueryClient();

  useEffect(() => {
    initObservability();
  }, []);

  useEffect(
    () => watchUserIdentity<Me>(queryClient, userQueryKeys.me(), identifyUser),
    [queryClient],
  );

  return null;
}
