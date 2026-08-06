import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let mockIsActive = true;

vi.mock('@stackflow/react', () => ({
  useActivity: () => ({ isActive: mockIsActive }),
}));

import { useRefetchOnActive } from './use-refetch-on-active';

afterEach(() => {
  mockIsActive = true;
});

describe('useRefetchOnActive', () => {
  it('isActive=true로 최초 마운트되면 refetch를 호출하지 않는다', () => {
    mockIsActive = true;
    const refetch = vi.fn();

    renderHook(() => useRefetchOnActive(refetch, true));

    expect(refetch).not.toHaveBeenCalled();
  });

  it('isActive=false로 최초 마운트되면 refetch를 호출하지 않는다', () => {
    mockIsActive = false;
    const refetch = vi.fn();

    renderHook(() => useRefetchOnActive(refetch, true));

    expect(refetch).not.toHaveBeenCalled();
  });

  it('isActive가 false→true로 바뀌고 isStale이면 refetch를 호출한다', () => {
    mockIsActive = false;
    const refetch = vi.fn();
    const { rerender } = renderHook(() => useRefetchOnActive(refetch, true));

    mockIsActive = true;
    rerender();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('isActive가 false→true로 바뀌어도 isStale이 아니면 refetch를 호출하지 않는다', () => {
    mockIsActive = false;
    const refetch = vi.fn();
    const { rerender } = renderHook(() => useRefetchOnActive(refetch, false));

    mockIsActive = true;
    rerender();

    expect(refetch).not.toHaveBeenCalled();
  });

  it('isActive가 true→false로 바뀔 때는 refetch를 호출하지 않는다', () => {
    mockIsActive = true;
    const refetch = vi.fn();
    const { rerender } = renderHook(() => useRefetchOnActive(refetch, true));

    mockIsActive = false;
    rerender();

    expect(refetch).not.toHaveBeenCalled();
  });

  it('isActive가 true로 유지된 채 리렌더만 반복되면 refetch를 호출하지 않는다', () => {
    mockIsActive = true;
    const refetch = vi.fn();
    const { rerender } = renderHook(() => useRefetchOnActive(refetch, true));

    rerender();
    rerender();

    expect(refetch).not.toHaveBeenCalled();
  });

  it('false→true 전환이 여러 번 반복되면 그때마다 refetch를 호출한다', () => {
    mockIsActive = false;
    const refetch = vi.fn();
    const { rerender } = renderHook(() => useRefetchOnActive(refetch, true));

    mockIsActive = true;
    rerender();
    mockIsActive = false;
    rerender();
    mockIsActive = true;
    rerender();

    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('isActive 전환 없이 isStale만 바뀌는 것으로는 refetch를 호출하지 않는다', () => {
    mockIsActive = true;
    const refetch = vi.fn();
    const { rerender } = renderHook(({ isStale }) => useRefetchOnActive(refetch, isStale), {
      initialProps: { isStale: false },
    });

    rerender({ isStale: true });

    expect(refetch).not.toHaveBeenCalled();
  });
});
