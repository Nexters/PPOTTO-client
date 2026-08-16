import { useMutation } from '@tanstack/react-query';

import { stickerApi, type StickerCommentPosition } from './sticker-api';

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

type UpdateStickerTitleVariables = {
  stickerId: string;
  title: string;
};

export const useUpdateStickerTitleMutation = () =>
  useMutation({
    mutationFn: ({ stickerId, title }: UpdateStickerTitleVariables) =>
      stickerApi.updateTitle(stickerId, title),
  });

type UpdateStickerCommentPositionsVariables = {
  stickerId: string;
  comments: StickerCommentPosition[];
};

export const useUpdateStickerCommentPositionsMutation = () =>
  useMutation({
    mutationFn: ({ stickerId, comments }: UpdateStickerCommentPositionsVariables) =>
      stickerApi.updateCommentPositions(stickerId, comments),
  });
