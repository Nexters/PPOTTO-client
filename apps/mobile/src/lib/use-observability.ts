import { useObservabilityLifecycle } from '@ppotto/observability';
import type { QueryClient } from '@tanstack/react-query';

import type { userApi } from '@/entities/user/api/user-api';
import { userQueryKeys } from '@/entities/user/api/user-query-keys';

import { identifyUser, initObservability } from './observability';

type Me = Awaited<ReturnType<typeof userApi.getMe>>;

const handlers = { init: initObservability, identify: identifyUser };

export function useObservability(queryClient: QueryClient) {
  useObservabilityLifecycle<Me>(queryClient, userQueryKeys.me(), handlers);
}
