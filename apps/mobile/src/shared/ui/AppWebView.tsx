import { contract } from '@gallery/bridge';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNativeBridge } from 'webview-bridge-kit/react-native';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';

// 앱 표준 웹뷰
export function AppWebView({ path = '' }: { path?: string }) {
  const ref = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);

  const { pushMessage } = useNativeBridge(ref, contract, {
    GET_ACCESS_TOKEN: () => ({ accessToken: null }),
    LOG: ({ level, args }) => console.warn('[web]', level, ...args),
    OPEN_PHOTO_SELECT: () => router.push('/photo-select'),
  });

  return (
    <View className="flex-1 bg-gray-900">
      <WebView
        ref={ref}
        source={{ uri: `${WEB_URL}${path}` }}
        onMessage={(e) => pushMessage(e.nativeEvent.data)}
        onLoadEnd={() => setLoaded(true)}
        allowsBackForwardNavigationGestures={false}
      />
      {!loaded && <View pointerEvents="none" className="absolute inset-0 bg-gray-900" />}
    </View>
  );
}
