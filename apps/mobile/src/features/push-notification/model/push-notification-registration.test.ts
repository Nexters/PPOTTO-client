import { deviceTokenApi } from '@/entities/notification';

import { getOrCreateDeviceId } from '../lib/device-id';
import { getFcmToken } from '../lib/firebase-messaging';
import { requestNotificationPermission } from '../lib/notification-permission';

import { registerPushNotification } from './push-notification-registration';

jest.mock('@/entities/notification', () => ({
  deviceTokenApi: { register: jest.fn() },
}));
jest.mock('../lib/device-id', () => ({ getOrCreateDeviceId: jest.fn() }));
jest.mock('../lib/firebase-messaging', () => ({ getFcmToken: jest.fn() }));
jest.mock('../lib/notification-permission', () => ({
  requestNotificationPermission: jest.fn(),
}));

const registerDeviceToken = jest.mocked(deviceTokenApi.register);
const getDeviceId = jest.mocked(getOrCreateDeviceId);
const getToken = jest.mocked(getFcmToken);
const requestPermission = jest.mocked(requestNotificationPermission);

beforeEach(() => {
  jest.clearAllMocks();
});

it.each(['denied', 'blocked', 'unsupported'] as const)(
  '알림 권한 상태가 %s이면 토큰을 등록하지 않는다',
  async (status) => {
    requestPermission.mockResolvedValue(status);

    await expect(registerPushNotification()).resolves.toEqual({ status });
    expect(getDeviceId).not.toHaveBeenCalled();
    expect(getToken).not.toHaveBeenCalled();
    expect(registerDeviceToken).not.toHaveBeenCalled();
  },
);

it('알림 권한을 허용하면 FCM 토큰을 Android 기기로 등록한다', async () => {
  requestPermission.mockResolvedValue('granted');
  getDeviceId.mockResolvedValue('device-id');
  getToken.mockResolvedValue('fcm-token');
  registerDeviceToken.mockResolvedValue(undefined);

  await expect(registerPushNotification()).resolves.toEqual({ status: 'registered' });
  expect(registerDeviceToken).toHaveBeenCalledWith({
    deviceId: 'device-id',
    platform: 'ANDROID',
    fcmToken: 'fcm-token',
  });
});
