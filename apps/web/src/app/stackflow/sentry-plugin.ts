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
  onBeforePush({ actionParams }) {
    startNavigationSpan(actionParams.activityName, 'stackflow.push');
  },
  onBeforeReplace({ actionParams }) {
    startNavigationSpan(actionParams.activityName, 'stackflow.replace');
  },
  onPopped({ actions }) {
    const activeActivity = actions.getStack().activities.find((activity) => activity.isActive);
    if (activeActivity) startNavigationSpan(activeActivity.name, 'stackflow.pop');
  },
});
