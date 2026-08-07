import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLongPress } from './use-long-press';

function fakeEvent(point: { x: number; y: number } | null) {
  return {
    target: {
      getStage: () => ({
        getPointerPosition: () => point,
      }),
    },
  } as unknown as Parameters<ReturnType<typeof useLongPress>['onMouseDown']>[0];
}

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('누르고 500ms 이상 유지하면 콜백이 실행된다', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    result.current.onMouseDown(fakeEvent({ x: 0, y: 0 }));
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('500ms 전에 손을 떼면 콜백이 실행되지 않는다', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    result.current.onMouseDown(fakeEvent({ x: 0, y: 0 }));
    vi.advanceTimersByTime(400);
    result.current.onMouseUp();
    vi.advanceTimersByTime(200);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('누른 채로 임계값 이상 움직이면 콜백이 실행되지 않는다', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    result.current.onMouseDown(fakeEvent({ x: 0, y: 0 }));
    result.current.onMouseMove(fakeEvent({ x: 20, y: 0 }));
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('임계값 이내로 살짝 움직이는 건 취소되지 않는다', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    result.current.onMouseDown(fakeEvent({ x: 0, y: 0 }));
    result.current.onMouseMove(fakeEvent({ x: 3, y: 0 }));
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('짧게 눌렀다 떼면 클릭 콜백이 실행된다', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }));

    result.current.onMouseDown(fakeEvent({ x: 0, y: 0 }));
    vi.advanceTimersByTime(200);
    result.current.onMouseUp();
    result.current.onClick();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('롱프레스가 발동한 뒤 이어지는 클릭은 무시된다', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }));

    result.current.onMouseDown(fakeEvent({ x: 0, y: 0 }));
    vi.advanceTimersByTime(500);
    result.current.onClick();

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('무시된 클릭 다음에 오는 새 클릭은 정상 실행된다', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }));

    result.current.onMouseDown(fakeEvent({ x: 0, y: 0 }));
    vi.advanceTimersByTime(500);
    result.current.onClick();

    result.current.onMouseDown(fakeEvent({ x: 0, y: 0 }));
    vi.advanceTimersByTime(200);
    result.current.onMouseUp();
    result.current.onClick();

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
