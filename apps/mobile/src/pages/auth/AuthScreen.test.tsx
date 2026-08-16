import { NetworkError } from '@ppotto/api';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { AuthScreen } from './AuthScreen';

jest.mock('@/shared/lib/app-ready', () => ({ useMarkAppReady: () => jest.fn() }));
jest.mock('@/lib/auth-session', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/shared/ui/AppWebView', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return { AppWebView: () => <Text>로그인 웹뷰</Text> };
});
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

const { getAccessToken } = jest.requireMock('@/lib/auth-session') as {
  getAccessToken: jest.Mock;
};
const { router } = jest.requireMock('expo-router') as {
  router: { replace: jest.Mock };
};

/**
 * 동작 범위 (2026-07-31 인터뷰)
 *
 * 앱 진입 시 RN에서 세션 복구를 먼저 수행한다. 성공하면 약관을 다시 확인하지 않고 바로 Board로
 * 이동하며, 인증할 수 없으면 로그인 WebView를 표시한다. 일시적 갱신 실패는 로그인으로 보내지 않는다.
 *
 * 제외: 자동 로그인 후 약관 재확인
 * 제외: 일반 브라우저에서 웹만 단독 실행하는 인증
 */
describe('앱 진입 인증', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('세션 복구에 성공하면 로그인 화면을 거치지 않고 Board로 이동한다', async () => {
    getAccessToken.mockResolvedValue('restored-access');

    await render(<AuthScreen />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/board'));
    expect(screen.queryByText('로그인 웹뷰')).not.toBeOnTheScreen();
  });

  it('refreshToken이 없으면 로그인 화면을 표시한다', async () => {
    getAccessToken.mockResolvedValue(null);

    await render(<AuthScreen />);

    expect(await screen.findByText('로그인 웹뷰')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('일시적 갱신 실패면 재시도 화면을 표시하고 다시 시도해 성공하면 Board로 이동한다', async () => {
    const user = userEvent.setup();
    getAccessToken
      .mockRejectedValueOnce(new NetworkError(new TypeError('offline')))
      .mockResolvedValueOnce('restored-access');

    await render(<AuthScreen />);
    await user.press(await screen.findByRole('button', { name: '다시 시도' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/board'));
  });
});
