import { renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { expect, it, vi } from 'vitest';

const { activity, track } = vi.hoisted(() => ({
  activity: { isActive: false, transitionState: 'enter-active' },
  track: vi.fn(),
}));
vi.mock('@stackflow/react', () => ({ useActivity: () => activity }));
vi.mock('./bridge', () => ({ track }));

import { useTrackActivityView } from './use-track-activity-view';

it('활성 진입 완료·준비된 콘텐츠만 기록하고 재렌더/StrictMode 중복을 제외한다', () => {
  const { rerender } = renderHook(
    ({ ready, step }) => useTrackActivityView(ready, 'onboarding_step_viewed', { step }),
    { initialProps: { ready: false, step: 1 }, wrapper: StrictMode },
  );
  activity.isActive = true;
  rerender({ ready: true, step: 1 });
  expect(track).not.toHaveBeenCalled();
  activity.transitionState = 'enter-done';
  rerender({ ready: false, step: 1 });
  expect(track).not.toHaveBeenCalled();
  rerender({ ready: true, step: 1 });
  rerender({ ready: true, step: 1 });
  expect(track).toHaveBeenCalledTimes(1);
  rerender({ ready: true, step: 2 });
  expect(track).toHaveBeenCalledTimes(2);
  activity.isActive = false;
  rerender({ ready: true, step: 3 });
  expect(track).toHaveBeenCalledTimes(2);
  activity.isActive = true;
  rerender({ ready: true, step: 2 });
  expect(track).toHaveBeenCalledTimes(3);
  const second = renderHook(
    () => useTrackActivityView(true, 'screen_view', { screen_name: 'board' }),
    { wrapper: StrictMode },
  );
  expect(track).toHaveBeenCalledTimes(4);
  second.unmount();
});
