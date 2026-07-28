import { unwrapData } from '@ppotto/api';

import { api } from '@/shared/api/client';

export const userApi = {
  getMe: () => unwrapData(api.GET('/users/me')),
};
