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
let mockScrollEnabled: boolean | undefined;
const mockPushMessage = jest.fn();
const mockEmit = jest.fn();
const mockFileWrite = jest.fn();
const mockTrack = jest.fn();

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('@/shared/lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
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
jest.mock('@/shared/lib/sentry-webview-trace', () => ({
  buildWebViewTraceScript: jest.fn(() => ''),
}));
jest.mock('expo-file-system', () => ({
  File: jest.fn(() => ({
    uri: 'file:///cache/recap-instagram-story.png',
    write: mockFileWrite,
    delete: jest.fn(),
  })),
  Paths: { cache: 'cache' },
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  Social: { InstagramStories: 'instagramstories' },
  default: {
    Social: { INSTAGRAM_STORIES: 'instagramstories' },
    isPackageInstalled: jest.fn(),
    shareSingle: jest.fn(),
  },
}));
jest.mock('@/shared/ui/AppBackground', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return { AppBackground: () => <Text>앱 로딩 배경</Text> };
});
jest.mock('react-native-safe-area-context', () => ({
  ...(jest.requireActual('react-native-safe-area-context') as object),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
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
        scrollEnabled?: boolean;
      }
    >(function MockWebView(
      {
        injectedJavaScriptBeforeContentLoaded,
        onLoad,
        onLoadEnd,
        onMessage,
        onOpenWindow,
        webviewDebuggingEnabled,
        scrollEnabled,
      },
      _ref,
    ) {
      mockOnLoad = onLoad;
      mockOnLoadEnd = onLoadEnd;
      mockOnMessage = onMessage;
      mockOnOpenWindow = onOpenWindow;
      mockInjectedJavaScript = injectedJavaScriptBeforeContentLoaded;
      mockWebviewDebuggingEnabled = webviewDebuggingEnabled;
      mockScrollEnabled = scrollEnabled;
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
const share = (
  jest.requireMock('react-native-share') as {
    default: { isPackageInstalled: jest.Mock; shareSingle: jest.Mock };
  }
).default;
const { buildWebViewTraceScript: mockBuildWebViewTraceScript } = jest.requireMock(
  '@/shared/lib/sentry-webview-trace',
) as { buildWebViewTraceScript: jest.Mock };
const originalQaToolEnabled = process.env.EXPO_PUBLIC_QA_TOOL_ENABLED;

beforeEach(() => {
  process.env.EXPO_PUBLIC_QA_TOOL_ENABLED = 'false';
  jest.clearAllMocks();
  mockBuildWebViewTraceScript.mockReturnValue('');
  mockOnLoad = undefined;
  mockOnLoadEnd = undefined;
  mockOnMessage = undefined;
  mockOnOpenWindow = undefined;
  mockInjectedJavaScript = undefined;
  mockWebviewDebuggingEnabled = undefined;
  mockScrollEnabled = undefined;
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

describe('WebView Analytics 브리지', () => {
  it('웹 이벤트를 네이티브 Firebase Analytics로 전달한다', async () => {
    await render(<AppWebView />);

    mockBridgeHandlers.TRACK_ANALYTICS_EVENT!({
      name: 'board_viewed',
      params: { photo_count: 3 },
    });

    expect(mockTrack).toHaveBeenCalledWith('board_viewed', { photo_count: 3 });
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

describe('인스타그램 스토리 공유', () => {
  it('설치되어 있으면 합성 이미지를 스토리 작성 화면으로 전달한다', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    share.shareSingle.mockResolvedValue({ success: true });
    await render(<AppWebView />);

    await expect(
      mockBridgeHandlers.SHARE_INSTAGRAM_STORY!({ base64: 'image-base64' }),
    ).resolves.toEqual({ success: true });

    expect(mockFileWrite).toHaveBeenCalledWith('image-base64', { encoding: 'base64' });
    expect(share.shareSingle).toHaveBeenCalledWith({
      social: 'instagramstories',
      appId: '1002723789453387',
      stickerImage: 'file:///cache/recap-instagram-story.png',
    });
  });

  it('설치되어 있지 않으면 앱스토어로 이동한다', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<AppWebView />);

    await expect(
      mockBridgeHandlers.SHARE_INSTAGRAM_STORY!({ base64: 'image-base64' }),
    ).resolves.toEqual({ success: true });

    expect(openURL).toHaveBeenCalledWith('https://apps.apple.com/app/instagram/id389801252');
    expect(share.shareSingle).not.toHaveBeenCalled();
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

    await act(async () => void mockBridgeHandlers.ANALYSIS_LOADING_READY!({ jobId: null }));
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
      jobId: 'job-1',
      photoCount: 20,
      photos: [{ id: 'photo-1', uri: 'data:image/jpeg;base64,image', width: 300, height: 400 }],
      visiblePhase: 'SCAN' as const,
      visualProgress: 25,
    };
    const nextState = { visiblePhase: 'GROUP' as const, visualProgress: 50 };
    const bridgeHandlers = {
      GET_ANALYSIS_LOADING_STATE: jest.fn(() => state),
      ANALYSIS_LOADING_READY: jest.fn(),
      ANALYSIS_LOADING_PHASE_STARTED: jest.fn(),
      ANALYSIS_LOADING_PHASE_FINISHED: jest.fn(() => nextState),
      ANALYSIS_LOADING_REVEAL_FINISHED: jest.fn(),
    };
    await render(<AppWebView bridgeHandlers={bridgeHandlers} path="/analysis-loading" />);

    expect(await mockBridgeHandlers.GET_ANALYSIS_LOADING_STATE!()).toEqual(state);
    await act(async () => void mockBridgeHandlers.ANALYSIS_LOADING_READY!({ jobId: 'job-1' }));
    await mockBridgeHandlers.ANALYSIS_LOADING_PHASE_STARTED!({ jobId: 'job-1', phase: 'SCAN' });
    expect(
      await mockBridgeHandlers.ANALYSIS_LOADING_PHASE_FINISHED!({
        jobId: 'job-1',
        phase: 'SCAN',
      }),
    ).toEqual(nextState);
    await mockBridgeHandlers.ANALYSIS_LOADING_REVEAL_FINISHED!({ jobId: 'job-1' });

    expect(bridgeHandlers.ANALYSIS_LOADING_READY).toHaveBeenCalledTimes(1);
    expect(bridgeHandlers.ANALYSIS_LOADING_PHASE_STARTED).toHaveBeenCalledWith({
      jobId: 'job-1',
      phase: 'SCAN',
    });
    expect(bridgeHandlers.ANALYSIS_LOADING_PHASE_FINISHED).toHaveBeenCalledWith({
      jobId: 'job-1',
      phase: 'SCAN',
    });
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

describe('보드 WebView 스크롤', () => {
  it('보드가 활성화되면 네이티브 스크롤을 끈다', async () => {
    await render(<AppWebView path="/board" />);

    expect(mockScrollEnabled).toBe(true);
    await act(async () => void mockBridgeHandlers.SET_BOARD_ACTIVE!({ active: true }));
    expect(mockScrollEnabled).toBe(false);
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

    expect(mockInjectedJavaScript).not.toContain('__qaDiagnosticsInstalled');
    expect(mockWebviewDebuggingEnabled).toBe(false);

    const message = '__QA_DIAGNOSTIC__:{"type":"console"}';
    mockOnMessage?.({ nativeEvent: { data: message } });
    expect(mockPushMessage).toHaveBeenCalledWith(message);
  });
});

describe('Sentry trace 전파', () => {
  it('네이티브 trace 스크립트를 웹뷰 로드 전에 주입한다', async () => {
    mockBuildWebViewTraceScript.mockReturnValue('window.__ppottoSentryTrace = {"a":1};');
    await render(<AppWebView />);

    expect(mockInjectedJavaScript).toContain('window.__ppottoSentryTrace');
  });

  it('QA 진단 스크립트와 함께 주입해도 둘 다 살아 있다', async () => {
    process.env.EXPO_PUBLIC_QA_TOOL_ENABLED = 'true';
    mockBuildWebViewTraceScript.mockReturnValue('window.__ppottoSentryTrace = {"a":1};');
    await render(<AppWebView />);

    expect(mockInjectedJavaScript).toContain('window.__ppottoSentryTrace');
    expect(mockInjectedJavaScript).toContain('__qaDiagnosticsInstalled');
  });

  it('trace 정보가 없으면 trace 스크립트는 주입하지 않는다', async () => {
    await render(<AppWebView />);

    expect(mockInjectedJavaScript).not.toContain('window.__ppottoSentryTrace');
  });
});

describe('세이프에리아 값 주입', () => {
  it('네이티브가 측정한 상단 세이프에리아 값을 CSS 커스텀 프로퍼티로 심어준다', async () => {
    await render(<AppWebView />);

    expect(mockInjectedJavaScript).toContain(
      "document.documentElement.style.setProperty('--rn-safe-area-inset-top', '47px');",
    );
  });

  it('네이티브가 측정한 하단 세이프에리아 값을 CSS 커스텀 프로퍼티로 심어준다', async () => {
    await render(<AppWebView />);

    expect(mockInjectedJavaScript).toContain(
      "document.documentElement.style.setProperty('--rn-safe-area-inset-bottom', '34px');",
    );
  });
});
