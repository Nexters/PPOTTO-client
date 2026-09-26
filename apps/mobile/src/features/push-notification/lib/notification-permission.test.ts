import {
  AuthorizationStatus,
  getMessaging,
  requestPermission,
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

import { requestNotificationPermission } from './notification-permission';

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    EPHEMERAL: 3,
  },
  getMessaging: jest.fn(),
  requestPermission: jest.fn(),
}));

const getFirebaseMessaging = jest.mocked(getMessaging);
const requestIosPermission = jest.mocked(requestPermission);

beforeEach(() => {
  jest.clearAllMocks();
});

it.each([
  AuthorizationStatus.AUTHORIZED,
  AuthorizationStatus.PROVISIONAL,
  AuthorizationStatus.EPHEMERAL,
])('iOS 권한 상태 %s를 허용으로 처리한다', async (status) => {
  const platform = jest.replaceProperty(Platform, 'OS', 'ios');
  const messaging = {} as ReturnType<typeof getMessaging>;
  getFirebaseMessaging.mockReturnValue(messaging);
  requestIosPermission.mockResolvedValue(status);

  try {
    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(requestIosPermission).toHaveBeenCalledWith(messaging);
  } finally {
    platform.restore();
  }
});

it('iOS 권한 거부를 설정 이동이 필요한 상태로 처리한다', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'ios');
  requestIosPermission.mockResolvedValue(AuthorizationStatus.DENIED);

  try {
    await expect(requestNotificationPermission()).resolves.toBe('blocked');
  } finally {
    platform.restore();
  }
});

it('iOS 권한이 아직 결정되지 않았으면 거부 상태로 처리한다', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'ios');
  requestIosPermission.mockResolvedValue(AuthorizationStatus.NOT_DETERMINED);

  try {
    await expect(requestNotificationPermission()).resolves.toBe('denied');
  } finally {
    platform.restore();
  }
});
