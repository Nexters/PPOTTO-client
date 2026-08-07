import { unwrapVoid } from '@ppotto/api';

import { api } from '@/lib/api';

export const userApi = {
  withdraw: () => unwrapVoid(api.DELETE('/users/me')),
};
