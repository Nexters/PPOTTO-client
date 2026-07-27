import { contract } from '@gallery/bridge';
import { router } from 'expo-router';
import { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { useNativeBridge } from 'webview-bridge-kit/react-native';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://192.168.1.218:3000';

export function WebViewScreen() {
  const ref = useRef<WebView>(null);

  const { pushMessage } = useNativeBridge(ref, contract, {
    GET_ACCESS_TOKEN: () => ({ accessToken: null }),
    LOG: ({ level, args }) => console.warn('[web]', level, ...args),
    OPEN_PHOTO_SELECT: () => router.push('/photo-select'),
  });

  return (
    <WebView
      ref={ref}
      source={{ uri: WEB_URL }}
      onMessage={(e) => pushMessage(e.nativeEvent.data)}
      allowsBackForwardNavigationGestures={false}
    />
  );
}
