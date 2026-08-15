'use client';

import { useObservabilityLifecycle } from '@ppotto/observability';
import { useQueryClient } from '@tanstack/react-query';

import type { userApi } from '@/entities/user/api/user-api';
import { userQueryKeys } from '@/entities/user/api/user-query-keys';
import { identifyUser, initObservability } from '@/shared/lib/observability';

type Me = Awaited<ReturnType<typeof userApi.getMe>>;

const handlers = { init: initObservability, identify: identifyUser };

export function ObservabilityProvider() {
  useObservabilityLifecycle<Me>(useQueryClient(), userQueryKeys.me(), handlers);

  return null;
}
