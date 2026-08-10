import { type paths, unwrapData, unwrapNullableData, unwrapVoid } from '@ppotto/api';

import { api } from '@/lib/api';

export type CreateAnalysisInput =
  paths['/analysis']['post']['requestBody']['content']['application/json'];

export const analysisApi = {
  create: (input: CreateAnalysisInput) => unwrapData(api.POST('/analysis', { body: input })),

  getActive: () => unwrapNullableData(api.GET('/analysis/active')),

  get: (analysisId: string) =>
    unwrapData(api.GET('/analysis/{analysisId}', { params: { path: { analysisId } } })),

  reissueUploadUrls: (analysisId: string) =>
    unwrapData(api.POST('/analysis/{analysisId}/reissue', { params: { path: { analysisId } } })),

  start: (analysisId: string) =>
    unwrapData(api.POST('/analysis/{analysisId}/start', { params: { path: { analysisId } } })),

  cancel: (analysisId: string) =>
    unwrapVoid(api.DELETE('/analysis/{analysisId}', { params: { path: { analysisId } } })),
};
