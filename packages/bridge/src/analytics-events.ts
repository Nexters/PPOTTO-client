/**
 * Analytics 이벤트 목록 — 웹·네이티브 공용.
 *
 * 이 파일은 정의만 한다. 실제 수집은 해당 화면/서비스에서 track()을 호출해야 시작된다.
 * - 한 행동은 웹 또는 네이티브 한 곳에서 기록한다.
 * - 화면은 실제 노출 시, 편집은 확정 시, 성공은 결과 확인 시 기록한다.
 * - 재렌더링·드래그 프레임·개별 폴링 응답마다 보내지 않는다.
 * - duration_ms는 해당 시도의 시작을 관측한 경우에만 보낸다. 재개 시 추측하지 않는다.
 * - 이메일, 사진/서명 URL, 입력 텍스트, 오류 원문은 보내지 않는다.
 */

type NoParams = Record<string, never>;
type LoginMethod = 'kakao' | 'apple' | 'development';
type UploadMode = 'initial' | 'additional';
type ShareMethod = 'kakao' | 'instagram';
type FailureParams = {
  /** 안정적인 서버/클라이언트 에러 코드. 오류 메시지 원문은 금지. */
  error_code?: string;
  /** HTTP 응답이 있을 때만 기록한다. 네트워크 오류에 임의 상태 코드를 넣지 않는다. */
  http_status?: number;
};

export type AnalyticsEvents = {
  // 화면
  /** 화면이 사용자에게 표시될 때 노출당 1회. 웹뷰의 실제 화면명을 사용한다. */
  screen_view: {
    screen_name:
      | 'login'
      | 'terms'
      | 'terms_detail'
      | 'onboarding'
      | 'photo_select'
      | 'analysis_loading'
      | 'board'
      | 'recap'
      | 'photo_viewer'
      | 'settings';
  };

  // 로그인·약관·온보딩
  /** 로그인 버튼을 눌러 인증을 시작했을 때. */
  login_started: { method: LoginMethod };
  /** 인증이 성공하고 앱의 로그인 세션이 설정됐을 때. GA 권장 이벤트. */
  login: { method: LoginMethod };
  /** 로그인 실패를 확인했을 때. 사용자 취소는 제외한다. */
  login_failed: { method: LoginMethod } & FailureParams;
  /** 사용자가 소셜 로그인 절차를 취소했을 때. */
  login_cancelled: { method: LoginMethod };
  /** 약관 동의 저장이 성공했을 때. */
  terms_accepted: { agreed_count: number };
  /** 온보딩 슬라이드가 실제로 표시될 때. step은 1부터 시작한다. */
  onboarding_step_viewed: { step: number };
  /** 마지막 슬라이드에서 사진 선택 화면으로 이동했을 때. */
  onboarding_completed: NoParams;

  // 사진 선택·업로드 (네이티브)
  /** 사진 접근 권한 요청 결과를 확인했을 때. 기존 권한을 읽을 때는 제외한다. */
  photo_permission_result: { access: 'all' | 'limited' | 'denied' };
  /** 사진 선택을 확정해 제출했을 때. 개별 사진 선택/해제마다 보내지 않는다. */
  photo_selection_confirmed: {
    upload_mode: UploadMode;
    photo_count: number;
    group_count: number;
  };
  /** 제출하지 않고 사진 선택 화면을 떠났을 때. */
  photo_selection_cancelled: { upload_mode: UploadMode; photo_count: number };
  /** 해당 업로드 시도의 실제 파일 전송을 시작했을 때 1회. 구버전 복구 작업의 모드는 생략. */
  photo_upload_started: { upload_mode?: UploadMode; photo_count: number };
  /** 이번 실행에서 PUT을 관측한 작업의 업로드·서버 시작 승인이 끝났을 때 1회. */
  photo_upload_completed: { photo_count: number; duration_ms?: number };
  /** 업로드가 최종 실패했을 때. 내부 자동 재시도 중 오류는 제외한다. */
  photo_upload_failed: FailureParams & { duration_ms?: number };

  // 분석 (네이티브)
  /** 앱이 해당 분석의 ANALYZING 상태를 처음 확인했을 때. 복구 작업의 사진 수를 모르면 생략. */
  analysis_started: { photo_count?: number };
  /** 앱이 COMPLETED를 확인했을 때. duration은 첫 ANALYZING 관측 이후 시간. 앱 재시작 간 중복은 가능하다. */
  analysis_completed: { duration_ms?: number };
  /** FAILED 또는 재시도 후 조회 실패를 사용자에게 안내하기로 했을 때 1회. */
  analysis_failed: FailureParams & {
    failure_kind: 'analysis-failed' | 'client-error' | 'server-error';
    duration_ms?: number;
  };
  /** 오류 피드백의 다시 시도/다시 확인 버튼을 눌렀을 때. 자동 재시도는 제외한다. */
  analysis_retry_clicked: { failure_kind: AnalyticsEvents['analysis_failed']['failure_kind'] };
  /** 분석 완료 후 결과 확인하기 버튼을 눌렀을 때. */
  analysis_result_clicked: NoParams;

  // 보드 편집 (웹)
  /** 보드 도구 모드가 사용자 조작으로 변경됐을 때. */
  board_tool_selected: { tool: 'default' | 'draw' | 'text' | 'move' };
  /** 보드의 스티커 추가 버튼을 눌렀을 때. */
  board_add_sticker_clicked: NoParams;
  /** 로고를 눌러 스티커 위치로 카메라를 되돌렸을 때. */
  board_recenter_clicked: NoParams;
  /** 스티커 변형이 끝나고 변경 내용의 저장이 성공했을 때. */
  sticker_edit_completed: { edit_type: 'move' | 'rotate' | 'resize' | 'transform' };
  /** 스티커 삭제가 성공했을 때. */
  sticker_deleted: NoParams;
  /** 보드 텍스트 추가/수정/변형/삭제의 저장이 성공했을 때. 텍스트 내용은 제외한다. */
  board_text_edit_completed: { action: 'create' | 'update' | 'transform' | 'delete' };
  /** 그리기 추가/변형/삭제의 저장이 성공했을 때. 좌표는 제외한다. */
  board_drawing_edit_completed: { action: 'create' | 'transform' | 'delete' };
  /** 실행 취소/다시 실행이 실제 적용됐을 때. */
  board_history_applied: { action: 'undo' | 'redo' };

  // 리캡·사진 보기·공유 (웹, 기기 저장 결과는 네이티브 응답 확인 후)
  /** 리캡 데이터가 로드되어 실제 콘텐츠가 표시됐을 때 노출당 1회. */
  recap_viewed: { entry_point: 'board' | 'share' };
  /** 앱 사진 크게보기에서 로드된 사진이 활성화됐을 때. photo_index는 그룹을 펼친 목록의 1부터 시작. */
  recap_photo_viewed: { photo_index: number; photo_count: number };
  /** 리캡 공유 시트가 열렸을 때. */
  recap_share_opened: NoParams;
  /** 공유 시트에서 실제 공유 대상을 눌렀을 때. 게시/전송 성공을 의미하지 않는다. */
  recap_share_clicked: { method: ShareMethod };
  /** 공유 이미지 준비 또는 외부 앱 전달이 실패했을 때. */
  recap_share_failed: { method: ShareMethod } & FailureParams;
  /** 리캡 저장을 시작했을 때. */
  recap_save_started: NoParams;
  /** 기기에 이미지가 저장됐다는 성공 결과를 확인했을 때. */
  recap_save_completed: NoParams;
  /** 이미지 준비/기기 저장의 실패를 확인했을 때. */
  recap_save_failed: FailureParams;

  // 설정
  /** 로그아웃이 성공했을 때. */
  logout: NoParams;
  /** 계정 탈퇴가 성공했을 때. */
  account_withdrawn: NoParams;

  // 개발환경 수집 점검 — 서비스 통계에서 제외
  /** 네이티브 앱의 개발환경 시작 시. 기존 연결 확인용 이벤트. */
  analytics_setup_test: NoParams;
  /** 개발환경 웹뷰 시작 시. 기존 브리지 연결 확인용 이벤트. */
  webview_analytics_setup_test: NoParams;
};

/** 이름과 파라미터의 짝을 유지한다. 필수 파라미터가 없을 때만 두 번째 인자를 생략한다. */
export type AnalyticsTrackArgs = {
  [Name in keyof AnalyticsEvents]: NoParams extends AnalyticsEvents[Name]
    ? [name: Name, params?: AnalyticsEvents[Name]]
    : [name: Name, params: AnalyticsEvents[Name]];
}[keyof AnalyticsEvents];

export type AnalyticsTracker = (...args: AnalyticsTrackArgs) => void;
