import { type paths, unwrapData, unwrapVoid } from '@ppotto/api';

import { api } from '@/shared/api/client';

export type AgreeTermsInput =
  paths['/terms/agreements']['post']['requestBody']['content']['application/json'];

export const termsApi = {
  list: () => unwrapData(api.GET('/terms')),
  agree: (input: AgreeTermsInput) => unwrapVoid(api.POST('/terms/agreements', { body: input })),
};
