import { contract, type AnalyticsTracker } from '@ppotto/bridge';
import { createWebBridge, webTransport } from 'webview-bridge-kit';

// 모듈 싱글턴 — React 밖(api 클라이언트 getToken)에서도 같은 인스턴스를 쓴다.
// webTransport는 window를 lazy access하므로 SSR에서도 안전하다.
export const bridge = createWebBridge(webTransport(), contract);

export const track: AnalyticsTracker = (name, params = {}) => {
  // 통계 전송 실패가 로그인·저장 같은 사용자 작업을 실패시키면 안 된다.
  try {
    bridge.send('TRACK_ANALYTICS_EVENT', { name, params });
  } catch {
    // 일반 브라우저 등 네이티브 수신기가 없는 환경에서는 수집하지 않는다.
  }
};
