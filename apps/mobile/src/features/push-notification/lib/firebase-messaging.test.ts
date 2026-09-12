import { getMessaging, getToken } from '@react-native-firebase/messaging';

import { getFcmToken } from './firebase-messaging';

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn(),
}));

const mockGetMessaging = jest.mocked(getMessaging);
const mockGetToken = jest.mocked(getToken);

beforeEach(() => {
  jest.clearAllMocks();
});

it('FCM 토큰을 요청할 때 Firebase Messaging 인스턴스를 조회한다', async () => {
  const messaging = {} as ReturnType<typeof getMessaging>;
  mockGetMessaging.mockReturnValue(messaging);
  mockGetToken.mockResolvedValue('fcm-token');

  expect(mockGetMessaging).not.toHaveBeenCalled();
  await expect(getFcmToken()).resolves.toBe('fcm-token');
  expect(mockGetMessaging).toHaveBeenCalledTimes(1);
  expect(mockGetToken).toHaveBeenCalledWith(messaging);
});
