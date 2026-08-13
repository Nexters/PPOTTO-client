import { useQuery } from '@tanstack/react-query';

import { termsApi } from './terms-api';
import { termsQueryKeys } from './terms-query-keys';

export const useTermsListQuery = () =>
  useQuery({
    queryKey: termsQueryKeys.list(),
    queryFn: termsApi.list,
  });
