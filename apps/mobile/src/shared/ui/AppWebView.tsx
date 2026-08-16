import { contract, type BridgeContract } from '@ppotto/bridge';
import { shareCustomTemplate } from '@react-native-kakao/share';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import Share, { Social } from 'react-native-share';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useMarkAppReady } from '@/shared/lib/app-ready';
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
}

// 앱 표준 웹뷰
export function AppWebView({
  path = '',
  onReady,
  bridgeHandlers,
  waitForAnalysisReady = false,
  waitForBoardReady = false,
  showBoard = false,
}: AppWebViewProps) {
  const qaToolEnabled = isQaToolEnabled();
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [boardActive, setBoardActive] = useState(false);
  const [traceScript] = useState(buildWebViewTraceScript);
  const markAppReady = useMarkAppReady();

  const injectedScript =
    [traceScript, qaToolEnabled ? WEB_QA_DIAGNOSTICS_SCRIPT : ''].filter(Boolean).join('\n') ||
    undefined;

  // 웹뷰가 첫 화면을 그렸다 — 커버를 걷고, 앱 시작 화면도 같이 비켜준다
  const markLoaded = () => {
    setLoaded(true);
    markAppReady();
  };

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
    BOARD_READY: () => markLoaded(),
    ANALYSIS_LOADING_READY: () => {
      markLoaded();
      return bridgeHandlers?.ANALYSIS_LOADING_READY?.();
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
    ANALYSIS_LOADING_REVEAL_FINISHED: () => bridgeHandlers?.ANALYSIS_LOADING_REVEAL_FINISHED?.(),
    SAVE_IMAGE: async ({ base64 }) => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
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
        const result = await Share.shareSingle({
          social: Social.InstagramStories,
          appId: INSTAGRAM_APP_ID,
          backgroundImage: file.uri,
        });

        return { success: result.success };
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

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        ref={ref}
        style={{ backgroundColor: '#000' }}
        source={{ uri: `${WEB_URL}${path}` }}
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
