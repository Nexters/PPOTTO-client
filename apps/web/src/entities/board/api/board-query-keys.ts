export const boardQueryKeys = {
  all: ['board'] as const,
  detail: (boardId: string) => [...boardQueryKeys.all, 'detail', boardId] as const,
};
