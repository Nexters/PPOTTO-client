export const stickerQueryKeys = {
  all: ['sticker'] as const,
  detail: (stickerId: string) => [...stickerQueryKeys.all, 'detail', stickerId] as const,
};
