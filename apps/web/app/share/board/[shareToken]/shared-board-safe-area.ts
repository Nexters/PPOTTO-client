// 시안의 상단 여백은 앱 상태바를 포함한 값이라 앱에서는 안전 영역 + 16px로 맞춘다.
// 브라우저는 상태바·주소창이 화면 밖에 있어 안전 영역이 0이므로, 주소창에 붙어 보이지 않게 32px를 최소로 둔다
export const SHARED_BOARD_PADDING_TOP =
  'max(calc(var(--rn-safe-area-inset-top, env(safe-area-inset-top)) + 1rem), 2rem)';
