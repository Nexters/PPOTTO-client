import { contract, type BridgeContract } from '@ppotto/bridge';
import { shareCustomTemplate } from '@react-native-kakao/share';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Linking, Platform } from 'react-native';
import Share, { Social } from 'react-native-share';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { Handlers } from 'webview-bridge-kit';
import { useNativeBridge } from 'webview-bridge-kit/react-native';

import {
  getAccessToken,
  loginWithApple,
  loginWithKakao,
  logout,
  withdraw,
} from '@/lib/auth-session';
import {
  recordWebQaDiagnosticMessage,
  WEB_QA_DIAGNOSTICS_SCRIPT,
} from '@/shared/lib/qa-diagnostics';
import { isQaToolEnabled } from '@/shared/lib/qa-tool';
import { buildWebViewTraceScript } from '@/shared/lib/sentry-webview-trace';
import { AppBackground } from '@/shared/ui/AppBackground';
import { useToast } from '@/shared/ui/Toast';

const WEB_URL = __DEV__ ? process.env.EXPO_PUBLIC_WEB_URL : 'https://ppotto.co.kr';

const HAPTIC_STYLES = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const;
const INSTAGRAM_APP_ID = '1002723789453387';
const INSTAGRAM_PACKAGE = 'com.instagram.android';
const KAKAO_SHARE_TEMPLATE_ID = 136185;

export function buildWebViewUri(uri: string, platform: string) {
  const separator = uri.includes('?') ? '&' : '?';
  return `${uri}${separator}nativePlatform=${encodeURIComponent(platform)}`;
}

async function openInstagramStore() {
  if (Platform.OS !== 'android') {
    await Linking.openURL('https://apps.apple.com/app/instagram/id389801252');
    return;
  }

  try {
    await Linking.openURL(`market://details?id=${INSTAGRAM_PACKAGE}`);
  } catch {
    await Linking.openURL(`https://play.google.com/store/apps/details?id=${INSTAGRAM_PACKAGE}`);
  }
}

type PageBridgeHandlers = Pick<
  Handlers<BridgeContract>,
  | 'GET_ANALYSIS_LOADING_STATE'
  | 'ANALYSIS_LOADING_READY'
  | 'ANALYSIS_LOADING_PHASE_STARTED'
  | 'ANALYSIS_LOADING_PHASE_FINISHED'
  | 'ANALYSIS_LOADING_REVEAL_FINISHED'
>;

interface AppWebViewProps {
  path?: string;
  onReady?: () => void;
  bridgeHandlers?: PageBridgeHandlers;
  waitForAnalysisReady?: boolean;
  waitForBoardReady?: boolean;
  showBoard?: boolean;
  downloadingFromICloud?: boolean;
}

// 앱 표준 웹뷰
export function AppWebView({
  path = '',
  onReady,
  bridgeHandlers,
  waitForAnalysisReady = false,
  waitForBoardReady = false,
  showBoard = false,
  downloadingFromICloud,
}: AppWebViewProps) {
  const qaToolEnabled = isQaToolEnabled();
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [boardActive, setBoardActive] = useState(false);
  const [traceScript] = useState(buildWebViewTraceScript);
  const insets = useSafeAreaInsets();

  // WKWebView 안에서는 env(safe-area-inset-*)이 실제 노치/홈 인디케이터 높이를 못 잡고 0으로
  // 계산되는 경우가 있어서(react-native-webview의 알려진 한계), 네이티브가 직접 측정한 값을 CSS
  // 커스텀 프로퍼티로 심어준다. 웹 쪽은 이 값을 우선 쓰고, 없으면(일반 브라우저 등) env()로 폴백한다
  const safeAreaScript = [
    `document.documentElement.style.setProperty('--rn-safe-area-inset-top', '${insets.top}px');`,
    `document.documentElement.style.setProperty('--rn-safe-area-inset-bottom', '${insets.bottom}px');`,
  ].join('\n');

  const injectedScript =
    [traceScript, safeAreaScript, qaToolEnabled ? WEB_QA_DIAGNOSTICS_SCRIPT : '']
      .filter(Boolean)
      .join('\n') || undefined;

  const markLoaded = () => setLoaded(true);

  const { bridge, pushMessage } = useNativeBridge(ref, contract, {
    APPLE_LOGIN: () => loginWithApple(),
    KAKAO_LOGIN: () => loginWithKakao(),
    GET_ACCESS_TOKEN: async ({ forceRefresh }) => ({
      accessToken: await getAccessToken({ forceRefresh }),
    }),
    LOGOUT: async () => {
      await logout();
      toast('로그아웃이 성공했습니다.');
      router.replace('/');
    },
    WITHDRAW: async () => {
      await withdraw();
      toast('탈퇴가 성공했습니다.');
      router.replace('/');
    },
    AUTH_EXPIRED: () => router.replace('/'),
    OPEN_PHOTO_SELECT: ({ boardId, mode }) =>
      router.push({ pathname: '/photo-select', params: { boardId, mode } }),
    SET_BOARD_ACTIVE: ({ active }) => setBoardActive(active),
    HAPTIC: ({ type }) => {
      void Haptics.impactAsync(HAPTIC_STYLES[type]);
    },
    // 웹 스택이 루트라 더 뒤로 갈 곳이 없음 — 앱을 백그라운드로 보낸다(안드로이드 표준 동작)
    EXIT_APP: () => {
      BackHandler.exitApp();
    },
    BOARD_READY: () => markLoaded(),
    ANALYSIS_LOADING_READY: (payload) => {
      markLoaded();
      return bridgeHandlers?.ANALYSIS_LOADING_READY?.(payload);
    },
    GET_ANALYSIS_LOADING_STATE: () => {
      const handler = bridgeHandlers?.GET_ANALYSIS_LOADING_STATE;
      if (!handler) throw new Error('analysis loading bridge handler is not configured');
      return handler();
    },
    ANALYSIS_LOADING_PHASE_STARTED: (payload) =>
      bridgeHandlers?.ANALYSIS_LOADING_PHASE_STARTED?.(payload),
    ANALYSIS_LOADING_PHASE_FINISHED: (payload) => {
      const handler = bridgeHandlers?.ANALYSIS_LOADING_PHASE_FINISHED;
      if (!handler) throw new Error('analysis loading bridge handler is not configured');
      return handler(payload);
    },
    ANALYSIS_LOADING_REVEAL_FINISHED: (payload) =>
      bridgeHandlers?.ANALYSIS_LOADING_REVEAL_FINISHED?.(payload),
    SAVE_IMAGE: async ({ base64 }) => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
        if (status !== 'granted') return { success: false };

        const file = new File(Paths.cache, `recap-${Date.now()}.png`);
        file.write(base64, { encoding: 'base64' });
        await MediaLibrary.saveToLibraryAsync(file.uri);
        file.delete();

        return { success: true };
      } catch (error) {
        console.warn('이미지 저장 실패', error);
        return { success: false };
      }
    },
    SHARE_INSTAGRAM_STORY: async ({ base64 }) => {
      try {
        const installed =
          Platform.OS === 'android'
            ? (await Share.isPackageInstalled(INSTAGRAM_PACKAGE)).isInstalled
            : await Linking.canOpenURL('instagram-stories://share');

        if (!installed) {
          await openInstagramStore();
          return { success: true };
        }

        const file = new File(Paths.cache, 'recap-instagram-story.png');
        file.write(base64, { encoding: 'base64' });
        await Share.shareSingle({
          social: Social.InstagramStories,
          appId: INSTAGRAM_APP_ID,
          stickerImage: file.uri,
        });
        return { success: true };
      } catch (error) {
        console.warn('인스타그램 스토리 공유 실패', error);
        return { success: false };
      }
    },
    SHARE_KAKAO: async ({ templateArgs }) => {
      try {
        await shareCustomTemplate({ templateId: KAKAO_SHARE_TEMPLATE_ID, templateArgs });
        return { success: true };
      } catch (error) {
        console.warn('카카오톡 공유 실패', error);
        return { success: false };
      }
    },
  });

  useEffect(() => {
    if (showBoard) bridge.emit('SHOW_BOARD');
  }, [bridge, showBoard]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      bridge.emit('KEYBOARD_HEIGHT_CHANGED', { height: e.endCoordinates.height });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      bridge.emit('KEYBOARD_HEIGHT_CHANGED', { height: 0 });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [bridge]);

  useEffect(() => {
    if (downloadingFromICloud === undefined) return;
    bridge.emit('ICLOUD_DOWNLOAD_CHANGED', { downloading: downloadingFromICloud });
  }, [bridge, downloadingFromICloud]);

  // 안드로이드 하드웨어 뒤로가기를 웹으로 전달한다
  // 네이티브 화면(사진 선택 등)이 위에 있을 땐 expo-router 기본 pop이 동작하게 한다
  const isFocused = useIsFocused();
  useEffect(() => {
    if (Platform.OS !== 'android' || !isFocused) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      bridge.emit('NAVIGATE_BACK');
      return true;
    });
    return () => subscription.remove();
  }, [bridge, isFocused]);

  return (
    <SafeAreaView
      edges={Platform.OS === 'android' ? ['bottom'] : []}
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <WebView
        ref={ref}
        style={{ backgroundColor: '#000' }}
        source={{ uri: buildWebViewUri(`${WEB_URL}${path}`, Platform.OS) }}
        keyboardDisplayRequiresUserAction={false}
        injectedJavaScriptBeforeContentLoaded={injectedScript}
        onMessage={(e) => {
          const data = e.nativeEvent.data;
          if (!recordWebQaDiagnosticMessage(data)) pushMessage(data);
        }}
        onLoad={() => {
          if (ready.current) return;
          ready.current = true;
          onReady?.();
        }}
        onOpenWindow={({ nativeEvent: { targetUrl } }) => {
          if (!targetUrl.startsWith('https://')) return;
          void Linking.openURL(targetUrl).catch((error) =>
            console.warn('외부 링크 열기 실패', error),
          );
        }}
        onLoadEnd={() => {
          if (!waitForAnalysisReady && !waitForBoardReady) markLoaded();
        }}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        allowsBackForwardNavigationGestures={false}
        webviewDebuggingEnabled={qaToolEnabled}
        scrollEnabled={!boardActive}
        bounces={!boardActive}
        overScrollMode={boardActive ? 'never' : 'always'}
        scalesPageToFit={false}
      />
      {!loaded && <AppBackground />}
    </SafeAreaView>
  );
}
