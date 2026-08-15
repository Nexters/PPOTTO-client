import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSwipeNavigation } from './use-swipe-navigation';

function touchStartEvent(clientX: number): React.TouchEvent {
  return { touches: [{ clientX }] } as unknown as React.TouchEvent;
}

function touchEndEvent(clientX: number): React.TouchEvent {
  return { changedTouches: [{ clientX }] } as unknown as React.TouchEvent;
}

describe('useSwipeNavigation', () => {
  it('왼쪽으로 임계값 이상 스와이프하면 onSwipe(1)이 호출된다', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation(onSwipe));

    result.current.onTouchStart(touchStartEvent(200));
    result.current.onTouchEnd(touchEndEvent(100));

    expect(onSwipe).toHaveBeenCalledWith(1);
  });

  it('오른쪽으로 임계값 이상 스와이프하면 onSwipe(-1)이 호출된다', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation(onSwipe));

    result.current.onTouchStart(touchStartEvent(100));
    result.current.onTouchEnd(touchEndEvent(200));

    expect(onSwipe).toHaveBeenCalledWith(-1);
  });

  it('임계값 이내로 움직이면 onSwipe가 호출되지 않는다', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation(onSwipe));

    result.current.onTouchStart(touchStartEvent(100));
    result.current.onTouchEnd(touchEndEvent(130));

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('touchStart 없이 touchEnd만 발생하면 onSwipe가 호출되지 않는다', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation(onSwipe));

    result.current.onTouchEnd(touchEndEvent(200));

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('스와이프를 한 번 처리하고 나면 다음 touchEnd는 새 touchStart 전까지 무시된다', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation(onSwipe));

    result.current.onTouchStart(touchStartEvent(200));
    result.current.onTouchEnd(touchEndEvent(100));
    result.current.onTouchEnd(touchEndEvent(0));

    expect(onSwipe).toHaveBeenCalledTimes(1);
  });
});
