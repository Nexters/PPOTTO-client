import { contract, type BridgeContract } from '@ppotto/bridge';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
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
import {
  recordWebQaDiagnosticMessage,
  WEB_QA_DIAGNOSTICS_SCRIPT,
} from '@/shared/lib/qa-diagnostics';
import { isQaToolEnabled } from '@/shared/lib/qa-tool';
import { AppBackground } from '@/shared/ui/AppBackground';
import { useToast } from '@/shared/ui/Toast';

const WEB_URL = __DEV__ ? process.env.EXPO_PUBLIC_WEB_URL : 'https://ppotto.co.kr';

type PageBridgeHandlers = Pick<
  Handlers<BridgeContract>,
  | 'GET_ANALYSIS_LOADING_STATE'
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
    BOARD_READY: () => setLoaded(true),
    ANALYSIS_LOADING_READY: () => setLoaded(true),
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
        injectedJavaScriptBeforeContentLoaded={
          qaToolEnabled ? WEB_QA_DIAGNOSTICS_SCRIPT : undefined
        }
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
          if (!waitForAnalysisReady && !waitForBoardReady) setLoaded(true);
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
