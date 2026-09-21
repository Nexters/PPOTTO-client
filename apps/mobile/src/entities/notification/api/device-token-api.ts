import { type paths, unwrapVoid } from '@ppotto/api';

import { api } from '@/lib/api';

export type RegisterDeviceTokenInput =
  paths['/device-tokens']['post']['requestBody']['content']['application/json'];

export const deviceTokenApi = {
  register: (input: RegisterDeviceTokenInput) =>
    unwrapVoid(api.POST('/device-tokens', { body: input })),

  unregister: (deviceId: string) =>
    unwrapVoid(
      api.DELETE('/device-tokens', {
        params: { query: { deviceId } },
      }),
    ),
};
