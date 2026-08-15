import type { StackflowActions } from '@stackflow/core';
import type { StackflowReactPlugin } from '@stackflow/react';

import { trackScreen } from '@/shared/lib/observability';

function trackActiveActivity(actions: StackflowActions) {
  const active = actions.getStack().activities.find((activity) => activity.isActive);
  if (active) trackScreen(active.name);
}

export const observabilityPlugin: StackflowReactPlugin = () => ({
  key: 'observability',
  onInit({ actions }) {
    trackActiveActivity(actions);
  },
  onPushed({ effect }) {
    trackScreen(effect.activity.name);
  },
  onReplaced({ effect }) {
    trackScreen(effect.activity.name);
  },
  onPopped({ actions }) {
    trackActiveActivity(actions);
  },
});
