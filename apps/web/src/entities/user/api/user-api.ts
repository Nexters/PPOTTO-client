import { unwrapData, unwrapVoid } from '@ppotto/api';

import { api } from '@/shared/api/client';

export const userApi = {
  getMe: () => unwrapData(api.GET('/users/me')),
  withdraw: () => unwrapVoid(api.DELETE('/users/me')),
};
