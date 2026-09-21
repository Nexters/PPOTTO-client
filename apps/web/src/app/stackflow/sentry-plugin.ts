'use client';

import {
  getActiveSpan,
  getClient,
  getRootSpan,
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN,
  SEMANTIC_ATTRIBUTE_SENTRY_SOURCE,
  spanToJSON,
  startBrowserTracingNavigationSpan,
} from '@sentry/nextjs';
import type { StackflowReactPlugin } from '@stackflow/react';

import { addNavigationBreadcrumb } from '@/shared/lib/navigation-breadcrumb';

import { summarizeStack } from './stack-summary';

const SPAN_ORIGIN = 'auto.navigation.stackflow';

function renamePageLoadSpan(activityName: string) {
  const activeSpan = getActiveSpan();
  const rootSpan = activeSpan && getRootSpan(activeSpan);
  if (!rootSpan || spanToJSON(rootSpan).op !== 'pageload') return;

  rootSpan.updateName(activityName);
  rootSpan.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, 'custom');
}

function startNavigationSpan(activityName: string, navigationType: string) {
  const client = getClient();
  if (!client) return;

  startBrowserTracingNavigationSpan(client, {
    name: activityName,
    attributes: {
      [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'navigation',
      [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: SPAN_ORIGIN,
      [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'custom',
      'navigation.type': navigationType,
    },
  });
}

export const sentryPlugin: StackflowReactPlugin = () => ({
  key: 'sentry',
  onInit({ actions }) {
    const activeActivity = actions.getStack().activities.find((activity) => activity.isActive);
    if (activeActivity) renamePageLoadSpan(activeActivity.name);
  },
  onBeforePush({ actionParams, actions }) {
    addNavigationBreadcrumb(
      `push ${actionParams.activityName}`,
      summarizeStack(actions.getStack()),
    );
    startNavigationSpan(actionParams.activityName, 'stackflow.push');
  },
  onBeforeReplace({ actionParams, actions }) {
    addNavigationBreadcrumb(
      `replace ${actionParams.activityName}`,
      summarizeStack(actions.getStack()),
    );
    startNavigationSpan(actionParams.activityName, 'stackflow.replace');
  },

  onBeforePop({ actions }) {
    addNavigationBreadcrumb('pop', summarizeStack(actions.getStack()));
  },
  onPopped({ actions }) {
    const stack = actions.getStack();
    addNavigationBreadcrumb('popped', summarizeStack(stack));

    const activeActivity = stack.activities.find((activity) => activity.isActive);
    if (activeActivity) startNavigationSpan(activeActivity.name, 'stackflow.pop');
  },
});
