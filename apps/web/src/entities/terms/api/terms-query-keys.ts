export const termsQueryKeys = {
  all: ['terms'] as const,
  list: () => [...termsQueryKeys.all, 'list'] as const,
};
