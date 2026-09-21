import { captureMessage } from '@sentry/nextjs';
import type { StackflowReactPlugin } from '@stackflow/react';

import { addNavigationBreadcrumb } from '@/shared/lib/navigation-breadcrumb';

import { countAliveActivities, summarizeStack, type StackSnapshot } from './stack-summary';

export function shouldPreventRootPop(stack: StackSnapshot) {
  return countAliveActivities(stack) <= 1;
}

export const rootPopGuardPlugin = (): StackflowReactPlugin => () => ({
  key: 'root-pop-guard',
  onBeforePop({ actions }) {
    const stack = actions.getStack();
    if (!shouldPreventRootPop(stack)) return;

    const summary = summarizeStack(stack);
    addNavigationBreadcrumb('루트 pop 차단', summary);
    captureMessage('마지막 화면 pop 시도를 차단했다', { level: 'warning', extra: summary });

    actions.preventDefault();
  },
});
