import { render } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { AppWebView } from './AppWebView';

let mockBridgeHandlers: Record<string, (...args: never[]) => unknown>;
let mockOnLoad: (() => void) | undefined;
let mockOnMessage: ((event: { nativeEvent: { data: string } }) => void) | undefined;
let mockOnOpenWindow: ((event: { nativeEvent: { targetUrl: string } }) => void) | undefined;
const mockPushMessage = jest.fn();

jest.mock('@/lib/auth-session', () => ({
  getAccessToken: jest.fn(),
  loginWithApple: jest.fn(),
  loginWithKakao: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));
jest.mock('@/shared/ui/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('react-native-webview', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    WebView: React.forwardRef<
      unknown,
      {
        onLoad?: () => void;
        onMessage?: (event: { nativeEvent: { data: string } }) => void;
        onOpenWindow?: (event: { nativeEvent: { targetUrl: string } }) => void;
      }
    >(function MockWebView({ onLoad, onMessage, onOpenWindow }, _ref) {
      mockOnLoad = onLoad;
      mockOnMessage = onMessage;
      mockOnOpenWindow = onOpenWindow;
      return <View accessibilityLabel="웹뷰" />;
    }),
  };
});
jest.mock('webview-bridge-kit/react-native', () => ({
  useNativeBridge: (
    _ref: unknown,
    _contract: unknown,
    handlers: Record<string, (...args: never[]) => unknown>,
  ) => {
    mockBridgeHandlers = handlers;
    return { pushMessage: mockPushMessage };
  },
}));

const { router } = jest.requireMock('expo-router') as {
  router: { replace: jest.Mock };
};

/**
 * 동작 범위 (2026-07-31 인터뷰)
 *
 * 앱 사용 중 세션이 만료되면 현재 WebView를 유지하지 않고 로그인 화면으로 이동한다.
 */
describe('WebView 인증 만료', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('토큰 갱신이 AUTH-002로 실패하면 네비게이션을 초기화해 로그인 화면으로 이동한다', async () => {
    await render(<AppWebView />);

    await mockBridgeHandlers.AUTH_EXPIRED!();

    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

describe('WebView 외부 링크', () => {
  it('HTTPS 새 창만 기본 브라우저로 연다', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    render(<AppWebView />);

    mockOnOpenWindow?.({ nativeEvent: { targetUrl: 'https://example.com' } });
    mockOnOpenWindow?.({ nativeEvent: { targetUrl: 'javascript:alert(1)' } });

    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('https://example.com');
  });
});

describe('WebView 로딩', () => {
  it('페이지가 준비되면 부모에 한 번만 알린다', async () => {
    const onReady = jest.fn();
    await render(<AppWebView onReady={onReady} />);

    mockOnLoad?.();
    mockOnLoad?.();

    expect(onReady).toHaveBeenCalledTimes(1);
  });
});

describe('WebView QA 진단', () => {
  it('QA 진단 메시지는 기록하고 기존 브리지에는 전달하지 않는다', () => {
    render(<AppWebView />);

    mockOnMessage?.({
      nativeEvent: {
        data: '__QA_DIAGNOSTIC__:{"type":"console","at":1,"level":"log","message":"web"}',
      },
    });
    expect(mockPushMessage).not.toHaveBeenCalled();

    mockOnMessage?.({ nativeEvent: { data: '{"v":1,"kind":"command"}' } });
    expect(mockPushMessage).toHaveBeenCalledWith('{"v":1,"kind":"command"}');
  });
});
