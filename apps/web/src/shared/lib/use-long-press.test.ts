import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLongPress } from './use-long-press';

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('누르고 500ms 이상 유지하면 대상 id와 함께 콜백이 실행된다', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    result.current.start({ x: 0, y: 0 }, 'sticker-1');
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledWith('sticker-1');
  });

  it('500ms 전에 취소하면 콜백이 실행되지 않는다', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    result.current.start({ x: 0, y: 0 }, 'sticker-1');
    vi.advanceTimersByTime(400);
    result.current.cancel();
    vi.advanceTimersByTime(200);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('누른 채로 임계값 이상 움직이면 콜백이 실행되지 않는다', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    result.current.start({ x: 0, y: 0 }, 'sticker-1');
    result.current.move({ x: 20, y: 0 });
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('임계값 이내로 살짝 움직이는 건 취소되지 않는다', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    result.current.start({ x: 0, y: 0 }, 'sticker-1');
    result.current.move({ x: 3, y: 0 });
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('새로 start하면 이전 타이머는 취소되고 새 대상으로 다시 잡힌다', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    result.current.start({ x: 0, y: 0 }, 'sticker-1');
    vi.advanceTimersByTime(250);
    result.current.start({ x: 100, y: 100 }, 'sticker-2');
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledWith('sticker-2');
  });
});
