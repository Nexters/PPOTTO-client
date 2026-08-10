import { useMutation } from '@tanstack/react-query';

import { analysisApi } from './analysis-api';

export const useCreateAnalysisMutation = () =>
  useMutation({
    mutationFn: analysisApi.create,
  });

export const useReissueUploadUrlsMutation = () =>
  useMutation({
    mutationFn: analysisApi.reissueUploadUrls,
  });

export const useStartAnalysisMutation = () =>
  useMutation({
    mutationFn: analysisApi.start,
  });

export const useCancelAnalysisMutation = () =>
  useMutation({
    mutationFn: analysisApi.cancel,
  });
