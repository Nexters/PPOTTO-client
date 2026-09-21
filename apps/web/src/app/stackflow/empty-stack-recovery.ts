import { captureMessage } from '@sentry/nextjs';
import type { StackflowReactPlugin } from '@stackflow/react';

import { addNavigationBreadcrumb } from '@/shared/lib/navigation-breadcrumb';
import { uuidv7 } from '@/shared/lib/uuidv7';

import { countAliveActivities, summarizeStack } from './stack-summary';

// TODO: 보드를 여러 개 만들 수 있게 되면 어느 보드로 복구할지 다시 정한다
const RECOVERY_ACTIVITY = 'Board';

export type EmptyStackRecoveryState = { hasSeenActivity: boolean; isRecovering: boolean };

export const initialEmptyStackRecoveryState: EmptyStackRecoveryState = {
  hasSeenActivity: false,
  isRecovering: false,
};

/**
 * `hasSeenActivity`는 앱이 뜨기 전 빈 스택을 복구 대상으로 오해하지 않게 하고,
 * `isRecovering`은 복구 push가 실패해도 무한히 재시도하지 않게 한다.
 */
export function reduceEmptyStackRecovery(
  state: EmptyStackRecoveryState,
  aliveActivityCount: number,
): { state: EmptyStackRecoveryState; shouldRecover: boolean } {
  if (aliveActivityCount > 0) {
    return { state: { hasSeenActivity: true, isRecovering: false }, shouldRecover: false };
  }

  if (!state.hasSeenActivity || state.isRecovering) return { state, shouldRecover: false };

  return { state: { ...state, isRecovering: true }, shouldRecover: true };
}

/** 가드를 거치지 않고 스택이 빈 경우(예: history-sync가 Popped를 직접 dispatch)의 마지막 안전망 */
export const emptyStackRecoveryPlugin = (): StackflowReactPlugin => () => {
  let state = initialEmptyStackRecoveryState;

  return {
    key: 'empty-stack-recovery',
    onChanged({ actions }) {
      const stack = actions.getStack();
      const result = reduceEmptyStackRecovery(state, countAliveActivities(stack));
      state = result.state;
      if (!result.shouldRecover) return;

      const summary = summarizeStack(stack);
      addNavigationBreadcrumb('빈 스택 복구', summary);
      captureMessage('화면 스택이 비어 보드로 복구했다', { level: 'error', extra: summary });

      actions.push({
        activityId: uuidv7(),
        activityName: RECOVERY_ACTIVITY,
        activityParams: {},
      });
    },
  };
};
