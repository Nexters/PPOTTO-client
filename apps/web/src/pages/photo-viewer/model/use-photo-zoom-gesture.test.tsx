import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';

import { usePhotoZoomGesture } from './use-photo-zoom-gesture';

function ZoomHarness({ onPinchStart }: { onPinchStart: () => void }) {
  const gestureRef = useRef<HTMLDivElement>(null);
  const interactionBlockedRef = useRef(false);
  const { isZoomed, handlers } = usePhotoZoomGesture(
    gestureRef,
    interactionBlockedRef,
    onPinchStart,
  );

  return <div ref={gestureRef} data-testid="gesture" data-zoomed={isZoomed} {...handlers} />;
}

describe('usePhotoZoomGesture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'PointerEvent',
      class MockPointerEvent extends MouseEvent {
        pointerId: number;

        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 0;
        }
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('두 번째 포인터가 들어오면 기존 제스처를 취소하고 중심점 기준으로 확대한다', () => {
    const onPinchStart = vi.fn();
    render(<ZoomHarness onPinchStart={onPinchStart} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });
    gesture.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    const secondPointer = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 2,
      clientX: 200,
      clientY: 100,
    });
    fireEvent(gesture, secondPointer);
    fireEvent.pointerMove(gesture, { pointerId: 2, clientX: 300, clientY: 100 });
    act(() => vi.advanceTimersByTime(20));

    expect(onPinchStart).toHaveBeenCalledTimes(1);
    expect(secondPointer.defaultPrevented).toBe(true);
    expect(gesture.style.transform).toBe('translate3d(-100px, -100px, 0) scale(2)');
    expect(gesture.dataset.zoomed).toBe('true');
  });

  it('최소 배율로 축소하면 원래 위치와 크기로 복귀한다', () => {
    render(<ZoomHarness onPinchStart={vi.fn()} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });
    gesture.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(gesture, { pointerId: 2, clientX: 300, clientY: 100 });
    act(() => vi.advanceTimersByTime(20));
    fireEvent.pointerMove(gesture, { pointerId: 2, clientX: 110, clientY: 100 });
    act(() => vi.advanceTimersByTime(20));

    expect(gesture.style.transform).toBe('');
    expect(gesture.dataset.zoomed).toBe('false');

    fireEvent.pointerUp(gesture, { pointerId: 2, clientX: 110, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    const nextPointer = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 3,
    });
    fireEvent(gesture, nextPointer);

    expect(nextPointer.defaultPrevented).toBe(false);
  });
});
