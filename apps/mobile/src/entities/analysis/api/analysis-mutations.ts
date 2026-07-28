import { useMutation } from '@tanstack/react-query';

import { analysisApi } from './analysis-api';

export const useCreateAnalysisMutation = () =>
  useMutation({
    mutationFn: analysisApi.create,
  });
