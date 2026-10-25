export const boardQueryKeys = {
  all: ['board'] as const,
  list: () => [...boardQueryKeys.all, 'list'] as const,
  summaryList: () => [...boardQueryKeys.list(), 'summary'] as const,
  detail: (boardId?: string) => [...boardQueryKeys.all, 'detail', boardId] as const,
};
