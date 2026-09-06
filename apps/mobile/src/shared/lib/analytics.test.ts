import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

import { forwardAnalyticsEvent, track } from './analytics';

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(),
}));

it('이벤트를 한 번 전달하고 Firebase 오류를 사용자 작업으로 전파하지 않는다', () => {
  track('photo_upload_started', { photo_count: 3, upload_mode: 'additional' });
  expect(logEvent).toHaveBeenCalledTimes(1);
  expect(logEvent).toHaveBeenCalledWith({}, 'photo_upload_started', {
    photo_count: 3,
    upload_mode: 'additional',
  });
  jest.mocked(logEvent).mockImplementationOnce(() => {
    throw new Error('SDK failure');
  });
  expect(() => track('logout')).not.toThrow();
  jest.mocked(getAnalytics).mockImplementationOnce(() => {
    throw new Error('not initialized');
  });
  expect(() => forwardAnalyticsEvent('new_web_event', { count: 1 })).not.toThrow();
});
