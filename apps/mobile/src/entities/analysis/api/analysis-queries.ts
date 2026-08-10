import { useQuery } from '@tanstack/react-query';

import { analysisApi } from './analysis-api';
import { analysisQueryKeys } from './analysis-query-keys';

export const useAnalysisQuery = (analysisId: string) =>
  useQuery({
    queryKey: analysisQueryKeys.detail(analysisId),
    queryFn: () => analysisApi.get(analysisId),
  });
