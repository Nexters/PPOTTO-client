import { useQuery } from '@tanstack/react-query';

import { userApi } from './user-api';
import { userQueryKeys } from './user-query-keys';

export const useMeQuery = () =>
  useQuery({
    queryKey: userQueryKeys.me(),
    queryFn: userApi.getMe,
  });
