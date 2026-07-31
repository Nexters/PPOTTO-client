import { contract } from '@ppotto/bridge';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNativeBridge } from 'webview-bridge-kit/react-native';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://172.30.1.61:3000';

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
