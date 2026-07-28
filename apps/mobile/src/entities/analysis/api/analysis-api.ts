import { type paths, unwrapData } from '@ppotto/api';

import { api } from '@/lib/api';

export type CreateAnalysisInput =
  paths['/analysis']['post']['requestBody']['content']['application/json'];

export const analysisApi = {
  create: (input: CreateAnalysisInput) => unwrapData(api.POST('/analysis', { body: input })),
};
