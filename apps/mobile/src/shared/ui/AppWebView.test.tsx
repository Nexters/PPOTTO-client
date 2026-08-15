import { act, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { AppWebView } from './AppWebView';

let mockBridgeHandlers: Record<string, (payload?: unknown) => unknown>;
let mockOnLoad: (() => void) | undefined;
let mockOnLoadEnd: (() => void) | undefined;
let mockOnMessage: ((event: { nativeEvent: { data: string } }) => void) | undefined;
let mockOnOpenWindow: ((event: { nativeEvent: { targetUrl: string } }) => void) | undefined;
let mockInjectedJavaScript: string | undefined;
let mockWebviewDebuggingEnabled: boolean | undefined;
const mockPushMessage = jest.fn();
const mockEmit = jest.fn();

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
jest.mock('@/shared/ui/AppBackground', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return { AppBackground: () => <Text>앱 로딩 배경</Text> };
});
jest.mock('react-native-webview', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    WebView: React.forwardRef<
      unknown,
      {
        onLoad?: () => void;
        onLoadEnd?: () => void;
        onMessage?: (event: { nativeEvent: { data: string } }) => void;
        onOpenWindow?: (event: { nativeEvent: { targetUrl: string } }) => void;
        injectedJavaScriptBeforeContentLoaded?: string;
        webviewDebuggingEnabled?: boolean;
      }
    >(function MockWebView(
      {
        injectedJavaScriptBeforeContentLoaded,
        onLoad,
        onLoadEnd,
        onMessage,
        onOpenWindow,
        webviewDebuggingEnabled,
      },
      _ref,
    ) {
      mockOnLoad = onLoad;
      mockOnLoadEnd = onLoadEnd;
      mockOnMessage = onMessage;
      mockOnOpenWindow = onOpenWindow;
      mockInjectedJavaScript = injectedJavaScriptBeforeContentLoaded;
      mockWebviewDebuggingEnabled = webviewDebuggingEnabled;
      return <View accessibilityLabel="웹뷰" />;
    }),
  };
});
jest.mock('webview-bridge-kit/react-native', () => ({
  useNativeBridge: (
    _ref: unknown,
    _contract: unknown,
    handlers: Record<string, (payload?: unknown) => unknown>,
  ) => {
    mockBridgeHandlers = handlers;
    return { bridge: { emit: mockEmit }, pushMessage: mockPushMessage };
  },
}));

const { router } = jest.requireMock('expo-router') as {
  router: { push: jest.Mock; replace: jest.Mock };
};
const originalQaToolEnabled = process.env.EXPO_PUBLIC_QA_TOOL_ENABLED;

beforeEach(() => {
  process.env.EXPO_PUBLIC_QA_TOOL_ENABLED = 'false';
  jest.clearAllMocks();
  mockOnLoad = undefined;
  mockOnLoadEnd = undefined;
  mockOnMessage = undefined;
  mockOnOpenWindow = undefined;
  mockInjectedJavaScript = undefined;
  mockWebviewDebuggingEnabled = undefined;
});

afterAll(() => {
  if (originalQaToolEnabled === undefined) delete process.env.EXPO_PUBLIC_QA_TOOL_ENABLED;
  else process.env.EXPO_PUBLIC_QA_TOOL_ENABLED = originalQaToolEnabled;
});

/**
 * 동작 범위 (2026-07-31 인터뷰)
 *
 * 앱 사용 중 세션이 만료되면 현재 WebView를 유지하지 않고 로그인 화면으로 이동한다.
 */
describe('WebView 인증 만료', () => {
  it('토큰 갱신이 AUTH-002로 실패하면 네비게이션을 초기화해 로그인 화면으로 이동한다', async () => {
    await render(<AppWebView />);

    await mockBridgeHandlers.AUTH_EXPIRED!();

    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

describe('WebView 외부 링크', () => {
  it('HTTPS 새 창만 기본 브라우저로 연다', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<AppWebView />);

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

  it('분석 로딩 화면은 웹 모션이 준비될 때까지 네이티브 배경을 유지한다', async () => {
    await render(<AppWebView path="/analysis-loading" waitForAnalysisReady />);

    await act(async () => mockOnLoadEnd?.());
    expect(screen.queryByText('앱 로딩 배경')).toBeOnTheScreen();

    await act(async () => void mockBridgeHandlers.ANALYSIS_LOADING_READY!());
    expect(screen.queryByText('앱 로딩 배경')).not.toBeOnTheScreen();
  });

  it('보드 화면은 웹 렌더가 끝날 때까지 네이티브 배경을 유지한다', async () => {
    await render(<AppWebView path="/board" waitForBoardReady />);

    await act(async () => mockOnLoadEnd?.());
    expect(screen.queryByText('앱 로딩 배경')).toBeOnTheScreen();

    await act(async () => void mockBridgeHandlers.BOARD_READY!());
    expect(screen.queryByText('앱 로딩 배경')).not.toBeOnTheScreen();
  });
});

describe('분석 로딩 브리지', () => {
  it('페이지 전용 로딩 메시지를 부모가 제공한 handler에 위임한다', async () => {
    const state = {
      photoCount: 20,
      photos: [{ id: 'photo-1', uri: 'data:image/jpeg;base64,image', width: 300, height: 400 }],
      visiblePhase: 'SCAN' as const,
      visualProgress: 25,
    };
    const nextState = { visiblePhase: 'GROUP' as const, visualProgress: 50 };
    const bridgeHandlers = {
      GET_ANALYSIS_LOADING_STATE: jest.fn(() => state),
      ANALYSIS_LOADING_PHASE_STARTED: jest.fn(),
      ANALYSIS_LOADING_PHASE_FINISHED: jest.fn(() => nextState),
      ANALYSIS_LOADING_REVEAL_FINISHED: jest.fn(),
    };
    await render(<AppWebView bridgeHandlers={bridgeHandlers} path="/analysis-loading" />);

    expect(await mockBridgeHandlers.GET_ANALYSIS_LOADING_STATE!()).toEqual(state);
    await mockBridgeHandlers.ANALYSIS_LOADING_PHASE_STARTED!({ phase: 'SCAN' });
    expect(await mockBridgeHandlers.ANALYSIS_LOADING_PHASE_FINISHED!({ phase: 'SCAN' })).toEqual(
      nextState,
    );
    await mockBridgeHandlers.ANALYSIS_LOADING_REVEAL_FINISHED!();

    expect(bridgeHandlers.ANALYSIS_LOADING_PHASE_STARTED).toHaveBeenCalledWith({ phase: 'SCAN' });
    expect(bridgeHandlers.ANALYSIS_LOADING_PHASE_FINISHED).toHaveBeenCalledWith({ phase: 'SCAN' });
    expect(bridgeHandlers.ANALYSIS_LOADING_REVEAL_FINISHED).toHaveBeenCalledTimes(1);
  });

  it('현재 웹뷰에 보드 전환 이벤트를 보낸다', async () => {
    const { rerender } = await render(<AppWebView path="/analysis-loading" />);

    expect(mockEmit).not.toHaveBeenCalled();
    await act(async () => rerender(<AppWebView path="/analysis-loading" showBoard />));

    expect(mockEmit).toHaveBeenCalledWith('SHOW_BOARD');
  });
});

describe('사진 선택 화면 이동', () => {
  it('웹이 전달한 업로드 모드를 사진 선택 화면에 넘긴다', async () => {
    await render(<AppWebView />);

    const openPhotoSelect = mockBridgeHandlers.OPEN_PHOTO_SELECT as (payload: {
      boardId: string;
      mode: 'initial' | 'additional';
    }) => void;
    openPhotoSelect({ boardId: 'board-1', mode: 'additional' });

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/photo-select',
      params: { boardId: 'board-1', mode: 'additional' },
    });
  });
});

describe('WebView QA 진단', () => {
  it('QA 진단 메시지는 기록하고 기존 브리지에는 전달하지 않는다', async () => {
    process.env.EXPO_PUBLIC_QA_TOOL_ENABLED = 'true';
    await render(<AppWebView />);

    expect(mockInjectedJavaScript).toContain('__qaDiagnosticsInstalled');
    expect(mockWebviewDebuggingEnabled).toBe(true);

    mockOnMessage?.({
      nativeEvent: {
        data: '__QA_DIAGNOSTIC__:{"type":"console","at":1,"level":"log","message":"web"}',
      },
    });
    expect(mockPushMessage).not.toHaveBeenCalled();

    mockOnMessage?.({ nativeEvent: { data: '{"v":1,"kind":"command"}' } });
    expect(mockPushMessage).toHaveBeenCalledWith('{"v":1,"kind":"command"}');
  });

  it('QA 도구가 꺼져 있으면 진단 스크립트와 WebView 디버깅을 비활성화한다', async () => {
    await render(<AppWebView />);

    expect(mockInjectedJavaScript).toBeUndefined();
    expect(mockWebviewDebuggingEnabled).toBe(false);

    const message = '__QA_DIAGNOSTIC__:{"type":"console"}';
    mockOnMessage?.({ nativeEvent: { data: message } });
    expect(mockPushMessage).toHaveBeenCalledWith(message);
  });
});
