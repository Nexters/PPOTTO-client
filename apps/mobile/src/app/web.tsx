import { contract } from '@gallery/bridge';
import { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { useNativeBridge } from 'webview-bridge-kit/react-native';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';

export default function WebScreen() {
  const ref = useRef<WebView>(null);

  const { pushMessage } = useNativeBridge(ref, contract, {
    GET_ACCESS_TOKEN: () => ({ accessToken: null }),
    // eslint-disable-next-line no-console
    LOG: ({ level, args }) => console[level]('[web]', ...args),
  });

  return (
    <WebView
      ref={ref}
      source={{ uri: WEB_URL }}
      onMessage={(e) => pushMessage(e.nativeEvent.data)}
    />
  );
}
