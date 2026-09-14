import { deviceTokenApi } from '@/entities/notification';

import { getDeviceId } from '../lib/device-id';

import { unregisterPushNotification } from './push-notification-lifecycle';

jest.mock('@/entities/notification', () => ({
  deviceTokenApi: { unregister: jest.fn() },
}));
jest.mock('../lib/device-id', () => ({ getDeviceId: jest.fn() }));

const unregisterDeviceToken = jest.mocked(deviceTokenApi.unregister);
const readDeviceId = jest.mocked(getDeviceId);

beforeEach(() => {
  jest.clearAllMocks();
});

it('저장된 기기 ID로 서버에 등록 해제를 요청한다', async () => {
  readDeviceId.mockResolvedValue('device-id');
  unregisterDeviceToken.mockResolvedValue(undefined);

  await unregisterPushNotification();

  expect(unregisterDeviceToken).toHaveBeenCalledWith('device-id');
});

it('저장된 기기 ID가 없으면 아무 요청도 하지 않는다', async () => {
  readDeviceId.mockResolvedValue(null);

  await unregisterPushNotification();

  expect(unregisterDeviceToken).not.toHaveBeenCalled();
});

it('서버 등록 해제가 실패하면 에러를 그대로 던진다', async () => {
  readDeviceId.mockResolvedValue('device-id');
  unregisterDeviceToken.mockRejectedValue(new Error('network error'));

  await expect(unregisterPushNotification()).rejects.toThrow('network error');
});
