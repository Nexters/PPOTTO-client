// 시안의 상단 여백은 앱 상태바를 포함한 값이다. 브라우저에서는 상태바가 화면 밖에 있어 안전 영역만큼만 더한다
export const SHARED_BOARD_PADDING_TOP =
  'calc(var(--rn-safe-area-inset-top, env(safe-area-inset-top)) + 1rem)';
