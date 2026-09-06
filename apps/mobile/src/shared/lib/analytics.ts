import type { AnalyticsTracker } from '@ppotto/bridge';
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

export const track: AnalyticsTracker = forwardAnalyticsEvent;

// 브리지에서 이름/원시값 검증을 마친 이벤트를 전달한다.
// 웹과 앱의 배포 시점이 달라도 새 웹 이벤트를 받을 수 있도록 수신 이름은 제한하지 않는다.
export function forwardAnalyticsEvent(name: string, params: Record<string, string | number> = {}) {
  try {
    logEvent(getAnalytics(), name, params);
  } catch {
    // Firebase 초기화/전송 실패는 사용자 작업의 성공·실패와 분리한다.
  }
}
