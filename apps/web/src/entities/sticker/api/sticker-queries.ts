import { queryOptions, useQuery } from '@tanstack/react-query';

import { SIGNED_URL_STALE_TIME_MS } from '@/shared/lib/signed-url';

import { stickerApi } from './sticker-api';
import { stickerQueryKeys } from './sticker-query-keys';

export const stickerQueryOptions = (stickerId: string) =>
  queryOptions({
    queryKey: stickerQueryKeys.detail(stickerId),
    queryFn: () => stickerApi.get(stickerId),
    staleTime: SIGNED_URL_STALE_TIME_MS,
  });

export const useStickerQuery = (stickerId: string) => useQuery(stickerQueryOptions(stickerId));
