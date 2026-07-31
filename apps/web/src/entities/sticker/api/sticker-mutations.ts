import { useMutation } from '@tanstack/react-query';

import { stickerApi } from './sticker-api';

export const useMarkStickerViewedMutation = () =>
  useMutation({
    mutationFn: (stickerId: string) => stickerApi.markViewed(stickerId),
  });
