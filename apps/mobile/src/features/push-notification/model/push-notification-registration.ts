import { Platform } from 'react-native';

import { analysisApi } from '@/entities/analysis/api/analysis-api';
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
  await deviceTokenApi.register({
    deviceId,
    platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    fcmToken,
  });
  return { status: 'registered' };
}

export async function requestAnalysisNotification(
  analysisId: string,
): Promise<PushNotificationRegistrationResult> {
  const result = await registerPushNotification();
  if (result.status !== 'registered') return result;

  await analysisApi.requestNotification(analysisId);
  return { status: 'registered' };
}
