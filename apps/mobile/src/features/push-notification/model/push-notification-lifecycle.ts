import { deviceTokenApi } from '@/entities/notification';

import { getDeviceId } from '../lib/device-id';

export async function unregisterPushNotification(): Promise<void> {
  const deviceId = await getDeviceId();
  if (deviceId) await deviceTokenApi.unregister(deviceId);
}
