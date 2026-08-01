import { contract } from '@ppotto/bridge';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNativeBridge } from 'webview-bridge-kit/react-native';

import { getAccessToken, loginWithApple, loginWithKakao } from '@/lib/auth-session';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

// 앱 표준 웹뷰
export function AppWebView({ path = '' }: { path?: string }) {
  const ref = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);

  const { pushMessage } = useNativeBridge(ref, contract, {
    APPLE_LOGIN: () => loginWithApple(),
    KAKAO_LOGIN: () => loginWithKakao(),
    GET_ACCESS_TOKEN: async ({ forceRefresh }) => ({
      accessToken: await getAccessToken({ forceRefresh }),
    }),
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
        onLoadEnd={() => setLoaded(true)}
        allowsBackForwardNavigationGestures={false}
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
