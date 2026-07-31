import { useQuery } from '@tanstack/react-query';

import { stickerApi } from './sticker-api';
import { stickerQueryKeys } from './sticker-query-keys';

export const useStickerQuery = (stickerId: string) =>
  useQuery({
    queryKey: stickerQueryKeys.detail(stickerId),
    queryFn: () => stickerApi.get(stickerId),
  });
