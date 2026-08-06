import { useQuery } from '@tanstack/react-query';

import { SIGNED_URL_STALE_TIME_MS } from '@/shared/lib/signed-url';

import { boardApi } from './board-api';
import { boardQueryKeys } from './board-query-keys';

export const useBoardQuery = (boardId: string) =>
  useQuery({
    queryKey: boardQueryKeys.detail(boardId),
    queryFn: () => boardApi.get(boardId),
    staleTime: SIGNED_URL_STALE_TIME_MS,
  });
