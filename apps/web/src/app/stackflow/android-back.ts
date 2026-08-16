import type { StackflowReactPlugin } from '@stackflow/react';

import { bridge } from '@/shared/lib/bridge';

// 살아있는(화면에 존재하는) 액티비티 수 — 플러그인 훅으로 스택 변화를 따라간다
let aliveActivityCount = 0;

type StackSnapshot = { activities: { transitionState: string }[] };

function syncAliveCount(stack: StackSnapshot) {
  aliveActivityCount = stack.activities.filter(
    (activity) =>
      activity.transitionState === 'enter-active' || activity.transitionState === 'enter-done',
  ).length;
}

/** 안드로이드 뒤로가기 판단에 쓰는 스택 깊이를 추적하는 stackflow 플러그인 */
export const androidBackPlugin = (): StackflowReactPlugin => () => ({
  key: 'android-back',
  onInit({ actions }) {
    syncAliveCount(actions.getStack());
  },
  onChanged({ actions }) {
    syncAliveCount(actions.getStack());
  },
});

/**
 * 열려 있는 오버레이(바텀시트·모달)가 있으면 ESC 키 이벤트로 닫는다.
 * Radix Dialog 계열은 document keydown의 Escape를 듣고 스스로 닫힌다.
 */
function closeOpenLayer(): boolean {
  const openLayer = document.querySelector('[role="dialog"][data-state="open"]');
  if (!openLayer) return false;

  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );
  return true;
}

/**
 * 안드로이드 하드웨어 뒤로가기 처리. 우선순위:
 * ① 열린 시트/모달 닫기 → ② 스택 pop → ③ 루트면 네이티브에 앱 이탈 위임
 */
export function handleNavigateBack(pop: () => void) {
  if (closeOpenLayer()) return;

  if (aliveActivityCount > 1) {
    pop();
    return;
  }

  bridge.send('EXIT_APP');
}

export function registerAndroidBackHandler(actions: { pop: () => void }) {
  return bridge.on('NAVIGATE_BACK', () => handleNavigateBack(() => actions.pop()));
}

// 테스트 전용 — 플러그인을 거치지 않고 스택 깊이를 설정한다
export function setAliveActivityCountForTest(count: number) {
  aliveActivityCount = count;
}
