'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { userApi } from '@/entities/user/api/user-api';
import { userQueryKeys } from '@/entities/user/api/user-query-keys';
import { identifyUser, initHyperDX } from '@/shared/lib/hyperdx';

type Me = Awaited<ReturnType<typeof userApi.getMe>>;

export function HyperDXProvider() {
  const queryClient = useQueryClient();

  useEffect(() => {
    initHyperDX();
  }, []);

  useEffect(() => {
    let lastUserId: string | undefined;

    const apply = () => {
      const id = queryClient.getQueryData<Me>(userQueryKeys.me())?.id;
      if (!id || id === lastUserId) return;
      lastUserId = id;
      identifyUser(id);
    };

    apply();
    return queryClient.getQueryCache().subscribe(apply);
  }, [queryClient]);

  return null;
}
