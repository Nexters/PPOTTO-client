import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';

import { usePhotoZoomGesture } from './use-photo-zoom-gesture';

function ZoomHarness({ onPinchStart }: { onPinchStart: () => void }) {
  const gestureRef = useRef<HTMLDivElement>(null);
  const interactionBlockedRef = useRef(false);
  const { isZoomed, resetZoom, handlers } = usePhotoZoomGesture(
    gestureRef,
    interactionBlockedRef,
    onPinchStart,
  );

  return (
    <div
      ref={gestureRef}
      data-testid="gesture"
      data-zoomed={isZoomed}
      {...handlers}
      onDoubleClick={resetZoom}
    />
  );
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

  it('확대 상태에서 한 포인터 이동을 사진 위치에 반영한다', () => {
    render(<ZoomHarness onPinchStart={vi.fn()} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });
    gesture.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(gesture, { pointerId: 2, clientX: 300, clientY: 100 });
    act(() => vi.advanceTimersByTime(20));
    fireEvent.pointerUp(gesture, { pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 1, clientX: 100, clientY: 100 });

    fireEvent.pointerDown(gesture, { pointerId: 3, clientX: 150, clientY: 150 });
    fireEvent.pointerMove(gesture, { pointerId: 3, clientX: 180, clientY: 170 });
    act(() => vi.advanceTimersByTime(20));

    expect(gesture.style.transform).toBe('translate3d(-70px, -80px, 0) scale(2)');
  });

  it('포인터 캡처를 잃으면 진행 중인 제스처 상태를 정리한다', () => {
    render(<ZoomHarness onPinchStart={vi.fn()} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });
    gesture.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent(gesture, new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 }));
    fireEvent(gesture, new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 2 }));

    const nextPointer = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 3,
    });
    fireEvent(gesture, nextPointer);

    expect(nextPointer.defaultPrevented).toBe(false);
  });

  it('사진 변경 전에 확대 배율과 위치를 초기화한다', () => {
    render(<ZoomHarness onPinchStart={vi.fn()} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });
    gesture.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(gesture, { pointerId: 2, clientX: 300, clientY: 100 });
    act(() => vi.advanceTimersByTime(20));

    fireEvent.doubleClick(gesture);

    expect(gesture.style.transform).toBe('');
    expect(gesture.dataset.zoomed).toBe('false');
  });
});
