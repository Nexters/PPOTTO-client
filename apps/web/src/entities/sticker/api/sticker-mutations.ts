import { useMutation } from '@tanstack/react-query';

import { stickerApi } from './sticker-api';

export const useMarkStickerViewedMutation = () =>
  useMutation({
    mutationFn: (stickerId: string) => stickerApi.markViewed(stickerId),
  });

export const useRegenerateStickerMutation = () =>
  useMutation({
    mutationFn: (stickerId: string) => stickerApi.regenerate(stickerId),
  });

export const useDeleteStickerMutation = () =>
  useMutation({
    mutationFn: (stickerId: string) => stickerApi.delete(stickerId),
  });

export const useDeleteStickersMutation = () =>
  useMutation({
    mutationFn: (stickerIds: string[]) => Promise.all(stickerIds.map(stickerApi.delete)),
  });
