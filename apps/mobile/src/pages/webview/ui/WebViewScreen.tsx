import { contract } from '@gallery/bridge';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { useNativeBridge } from 'webview-bridge-kit/react-native';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';

export function WebViewScreen() {
  const ref = useRef<WebView>(null);

  const { path } = useLocalSearchParams<{ path?: string }>();
  const uri = `${WEB_URL}${path ?? ''}`;

  const { pushMessage } = useNativeBridge(ref, contract, {
    GET_ACCESS_TOKEN: () => ({ accessToken: null }),
    LOG: ({ level, args }) => console.warn('[web]', level, ...args),
    OPEN_PHOTO_SELECT: () => router.push('/photo-select'),
  });

  return (
    <WebView
      ref={ref}
      source={{ uri }}
      onMessage={(e) => pushMessage(e.nativeEvent.data)}
      allowsBackForwardNavigationGestures={false}
    />
  );
}
