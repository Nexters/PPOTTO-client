export const userQueryKeys = {
  all: ['user'] as const,
  me: () => [...userQueryKeys.all, 'me'] as const,
};
