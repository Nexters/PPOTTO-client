import type { QueryClient, QueryKey } from '@tanstack/react-query';

export function watchUserIdentity<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  onIdentify: (userId: string) => void,
) {
  let lastUserId: string | undefined;

  const apply = () => {
    const userId = queryClient.getQueryData<T>(queryKey)?.id;
    if (!userId || userId === lastUserId) return;
    lastUserId = userId;
    onIdentify(userId);
  };

  apply();
  return queryClient.getQueryCache().subscribe(apply);
}
