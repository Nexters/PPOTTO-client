import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePhotoDismissGesture } from './use-photo-dismiss-gesture';

function GestureHarness({ onDismiss }: { onDismiss: () => void }) {
  const { gestureRef, viewerRef, backdropRef, headerRef, filmstripRef, handlers } =
    usePhotoDismissGesture(onDismiss);

  return (
    <div ref={viewerRef} data-testid="viewer">
      <div ref={backdropRef} data-testid="backdrop" />
      <div ref={headerRef} data-testid="header" />
      <div ref={gestureRef} data-testid="gesture" {...handlers}>
        <span data-testid="photo-child" />
      </div>
      <div ref={filmstripRef} data-testid="filmstrip" />
    </div>
  );
}

describe('usePhotoDismissGesture', () => {
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

  it('아래로 충분히 드래그하면 퇴장 모션 후 닫는다', () => {
    const onDismiss = vi.fn();
    render(<GestureHarness onDismiss={onDismiss} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0 });
    fireEvent.pointerMove(gesture, { pointerId: 1, clientX: 102, clientY: 260, timeStamp: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 1, clientX: 102, clientY: 260, timeStamp: 110 });

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.runAllTimers());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('아래쪽 대각선 드래그 중 사진은 손가락을 따라가고 배경과 조작 UI는 옅어진다', () => {
    render(<GestureHarness onDismiss={vi.fn()} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(gesture, { pointerId: 1, clientX: 150, clientY: 180 });
    act(() => vi.advanceTimersByTime(20));

    expect(gesture.style.transform).toContain('translate3d(50px, 80px, 0)');
    expect(Number(screen.getByTestId('backdrop').style.opacity)).toBeLessThan(1);
    expect(Number(screen.getByTestId('header').style.opacity)).toBe(0);
    expect(Number(screen.getByTestId('filmstrip').style.opacity)).toBe(0);
  });

  it('포인터가 취소되면 닫지 않고 원위치로 돌아간다', () => {
    const onDismiss = vi.fn();
    render(<GestureHarness onDismiss={onDismiss} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0 });
    fireEvent.pointerMove(gesture, { pointerId: 1, clientX: 100, clientY: 300, timeStamp: 100 });
    fireEvent.pointerCancel(gesture, { pointerId: 1 });
    act(() => vi.runAllTimers());

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('gesture')).toHaveStyle({ transform: '' });
    expect(screen.getByTestId('backdrop')).toHaveStyle({ opacity: '' });
  });

  it('자식의 암묵적 포인터 캡처가 해제돼도 진행 중인 세로 드래그를 취소하지 않는다', () => {
    const onDismiss = vi.fn();
    render(<GestureHarness onDismiss={onDismiss} />);
    const gesture = screen.getByTestId('gesture');
    const child = screen.getByTestId('photo-child');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });

    fireEvent.pointerDown(child, { pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0 });
    fireEvent.pointerMove(child, { pointerId: 1, clientX: 102, clientY: 180, timeStamp: 40 });
    fireEvent(child, new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 }));
    act(() => vi.advanceTimersByTime(20));

    expect(gesture.style.transform).toContain('translate3d(2px, 80px, 0)');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('가로 드래그는 뷰어를 움직이거나 닫지 않는다', () => {
    const onDismiss = vi.fn();
    render(<GestureHarness onDismiss={onDismiss} />);
    const gesture = screen.getByTestId('gesture');

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 200, clientY: 100, timeStamp: 0 });
    fireEvent.pointerMove(gesture, { pointerId: 1, clientX: 100, clientY: 105, timeStamp: 50 });
    fireEvent.pointerUp(gesture, { pointerId: 1, clientX: 100, clientY: 105, timeStamp: 60 });
    act(() => vi.runAllTimers());

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('gesture')).toHaveStyle({ transform: '' });
  });
});
