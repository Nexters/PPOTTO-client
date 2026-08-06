import { contract } from '@ppotto/bridge';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNativeBridge } from 'webview-bridge-kit/react-native';

import {
  getAccessToken,
  loginWithApple,
  loginWithKakao,
  logout,
  withdraw,
} from '@/lib/auth-session';
import { useToast } from '@/shared/ui/Toast';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

// 앱 표준 웹뷰
export function AppWebView({ path = '', onReady }: { path?: string; onReady?: () => void }) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const toast = useToast();

  const { pushMessage } = useNativeBridge(ref, contract, {
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
    LOG: ({ level, args }) => console.warn('[web]', level, ...args),
    OPEN_PHOTO_SELECT: () => router.push('/photo-select'),
  });

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={ref}
        source={{ uri: `${WEB_URL}${path}` }}
        onMessage={(e) => pushMessage(e.nativeEvent.data)}
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
        onLoadEnd={() => setLoaded(true)}
        allowsBackForwardNavigationGestures={false}
        webviewDebuggingEnabled={true}
      />
      {!loaded && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}
          className="bg-yellow-400"
        />
      )}
    </View>
  );
}
