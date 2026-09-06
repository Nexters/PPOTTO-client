import type { AnalyticsTrackArgs } from '@ppotto/bridge';
import { useActivity } from '@stackflow/react';
import { useEffect, useRef } from 'react';

import { track } from './bridge';

// Stackflow는 뒤의 화면을 마운트한 채 유지한다. 활성 노출/선택 변경만 기록한다.
export function useTrackActivityView(enabled: boolean, ...event: AnalyticsTrackArgs) {
  const { isActive, transitionState } = useActivity();
  const lastEvent = useRef<string | null>(null);

  useEffect(() => {
    if (!isActive || !enabled) {
      lastEvent.current = null;
      return;
    }
    if (transitionState !== 'enter-done') return;
    const key = JSON.stringify(event);
    if (lastEvent.current === key) return;
    lastEvent.current = key;
    track(...event);
  }, [isActive, transitionState, enabled, event]);
}
