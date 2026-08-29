import { contract } from '@ppotto/bridge';
import { createWebBridge, webTransport } from 'webview-bridge-kit';

// 모듈 싱글턴 — React 밖(api 클라이언트 getToken)에서도 같은 인스턴스를 쓴다.
// webTransport는 window를 lazy access하므로 SSR에서도 안전하다.
export const bridge = createWebBridge(webTransport(), contract);

export function track(name: string, params: Record<string, string | number> = {}) {
  bridge.send('TRACK_ANALYTICS_EVENT', { name, params });
}
