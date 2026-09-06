import type { AnalyticsTracker } from './analytics-events';

// pnpm --filter @ppotto/bridge typecheck로 검사한다. 이벤트를 실제로 보내지 않는다.
export function checkAnalyticsEventTypes(track: AnalyticsTracker) {
  track('analytics_setup_test');
  track('recap_save_completed', {});
  track('photo_upload_started', { photo_count: 30, upload_mode: 'additional' });
  track('analysis_failed', { failure_kind: 'server-error', http_status: 503 });
  track('recap_viewed', { entry_point: 'board' });

  // @ts-expect-error 등록되지 않은 이벤트 이름
  track('photo_uplaod_started', { photo_count: 30, upload_mode: 'initial' });
  // @ts-expect-error 필수 파라미터 전체 누락
  track('photo_upload_started');
  // @ts-expect-error 필수 photo_count 누락
  track('photo_upload_started', { upload_mode: 'initial' });
  // @ts-expect-error 숫자 파라미터에 문자열 사용
  track('photo_upload_started', { photo_count: '30', upload_mode: 'initial' });
  // @ts-expect-error 허용되지 않은 enum 값
  track('recap_share_clicked', { method: 'email' });
  // @ts-expect-error 다른 이벤트의 파라미터를 섞어 사용할 수 없음
  track('recap_viewed', { photo_count: 30, upload_mode: 'initial' });
  // @ts-expect-error 파라미터가 없는 이벤트에 데이터 추가
  track('analytics_setup_test', { email: 'not-collected' });
}
