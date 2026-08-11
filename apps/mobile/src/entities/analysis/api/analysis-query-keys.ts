export const analysisQueryKeys = {
  all: ['analysis'] as const,
  detail: (analysisId: string) => [...analysisQueryKeys.all, 'detail', analysisId] as const,
};
