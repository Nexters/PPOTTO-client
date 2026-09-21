/**
 * 동작 범위
 *
 * 리캡이 닫히는 애니메이션(300ms) 도중 뒤로가기가 한 번 더 들어오면 보드까지 pop되어 화면이
 * 비어버린다. stackflow의 전환 중 터치 차단은 React 커밋 이후에 걸려서 렌더가 밀리면 뚫리므로,
 * 여기서 ref로 즉시 잠근다.
 *
 * 잠금은 전환 시간이 지나면 풀린다. pop이 취소되어 화면이 그대로 남는 경우 뒤로가기 버튼이
 * 영영 죽지 않게 하기 위해서다.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TRANSITION_DURATION = 300;

vi.mock('@stackflow/react', () => ({
  useStack: () => ({ transitionDuration: TRANSITION_DURATION }),
}));

import { useSinglePop } from './use-single-pop';

describe('useSinglePop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('뒤로가기를 한 번 누르면 pop한다', () => {
    const pop = vi.fn();
    const { result } = renderHook(() => useSinglePop(pop));

    act(() => result.current());

    expect(pop).toHaveBeenCalledOnce();
  });

  it('화면이 닫히는 도중 다시 눌러도 pop은 한 번만 일어난다', () => {
    const pop = vi.fn();
    const { result } = renderHook(() => useSinglePop(pop));

    act(() => result.current());
    act(() => vi.advanceTimersByTime(TRANSITION_DURATION - 1));
    act(() => result.current());

    expect(pop).toHaveBeenCalledOnce();
  });

  it('전환이 끝나도록 화면이 남아 있으면 다시 누를 수 있다', () => {
    const pop = vi.fn();
    const { result } = renderHook(() => useSinglePop(pop));

    act(() => result.current());
    act(() => vi.advanceTimersByTime(TRANSITION_DURATION));
    act(() => result.current());

    expect(pop).toHaveBeenCalledTimes(2);
  });

  it('화면이 사라진 뒤에는 잠금 해제 타이머가 남지 않는다', () => {
    const pop = vi.fn();
    const { result, unmount } = renderHook(() => useSinglePop(pop));

    act(() => result.current());
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
