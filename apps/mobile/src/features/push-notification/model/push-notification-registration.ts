import { deviceTokenApi } from '@/entities/notification';

import { getOrCreateDeviceId } from '../lib/device-id';
import { getFcmToken } from '../lib/firebase-messaging';
import {
  type NotificationPermission,
  requestNotificationPermission,
} from '../lib/notification-permission';

export type PushNotificationRegistrationResult =
  { status: 'registered' } | { status: Exclude<NotificationPermission, 'granted'> };

export async function registerPushNotification(): Promise<PushNotificationRegistrationResult> {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return { status: permission };

  const [deviceId, fcmToken] = await Promise.all([getOrCreateDeviceId(), getFcmToken()]);
  await deviceTokenApi.register({ deviceId, platform: 'ANDROID', fcmToken });
  return { status: 'registered' };
}
