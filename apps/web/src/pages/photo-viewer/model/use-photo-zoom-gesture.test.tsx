import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLayoutEffect, useRef } from 'react';

import { usePhotoZoomGesture } from './use-photo-zoom-gesture';

function ZoomHarness({
  onPinchStart,
  onEdgeNavigate = () => undefined,
  dismissDragActive = false,
}: {
  onPinchStart: () => void;
  onEdgeNavigate?: (direction: 'previous' | 'next') => void;
  dismissDragActive?: boolean;
}) {
  const gestureRef = useRef<HTMLDivElement>(null);
  const interactionBlockedRef = useRef(false);
  const dismissDragActiveRef = useRef(dismissDragActive);
  useLayoutEffect(() => {
    dismissDragActiveRef.current = dismissDragActive;
  });
  const { resetZoom, handlers } = usePhotoZoomGesture(
    gestureRef,
    interactionBlockedRef,
    onPinchStart,
    onEdgeNavigate,
    dismissDragActiveRef,
  );

  return <div ref={gestureRef} data-testid="gesture" {...handlers} onDoubleClick={resetZoom} />;
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

  it('세로 닫기 드래그 중 추가 포인터로 핀치 확대를 시작하지 않는다', () => {
    const onPinchStart = vi.fn();
    const { rerender } = render(<ZoomHarness onPinchStart={onPinchStart} />);
    const gesture = screen.getByTestId('gesture');

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    rerender(<ZoomHarness onPinchStart={onPinchStart} dismissDragActive />);

    const secondPointer = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 2,
      clientX: 200,
      clientY: 100,
    });
    fireEvent(gesture, secondPointer);
    fireEvent.pointerMove(gesture, { pointerId: 2, clientX: 300, clientY: 100 });

    expect(secondPointer.defaultPrevented).toBe(true);
    expect(onPinchStart).not.toHaveBeenCalled();
    expect(gesture.style.transform).toBe('');
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
  });

  it('더블 탭한 지점을 중심으로 확대하고 다시 더블 탭하면 복귀한다', () => {
    render(<ZoomHarness onPinchStart={vi.fn()} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });
    gesture.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 2, clientX: 100, clientY: 100 });

    expect(gesture.style.transform).toBe('translate3d(-100px, -100px, 0) scale(2)');

    act(() => vi.advanceTimersByTime(180));
    fireEvent.pointerDown(gesture, { pointerId: 3, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 3, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 4, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 4, clientX: 100, clientY: 100 });

    expect(gesture.style.transform).toBe('');
  });

  it('두 탭 사이에 드래그가 있으면 더블 탭으로 처리하지 않는다', () => {
    render(<ZoomHarness onPinchStart={vi.fn()} />);
    const gesture = screen.getByTestId('gesture');
    gesture.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(gesture, { pointerId: 2, clientX: 120, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 2, clientX: 120, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 3, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 3, clientX: 100, clientY: 100 });

    expect(gesture.style.transform).toBe('');
  });

  it('사진 경계를 넘으면 저항을 적용하고 손을 놓으면 경계로 복귀한다', () => {
    render(<ZoomHarness onPinchStart={vi.fn()} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });
    gesture.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);
    const image = document.createElement('img');
    image.dataset.photoViewerActiveImage = 'true';
    Object.defineProperties(image, {
      naturalWidth: { value: 300 },
      naturalHeight: { value: 200 },
    });
    image.getBoundingClientRect = () => new DOMRect(0, 100, 300, 200);
    gesture.append(image);
    const zoomLayer = document.createElement('div');
    zoomLayer.dataset.photoViewerZoomLayer = '';
    const zoomImage = document.createElement('img');
    zoomImage.dataset.photoViewerZoomImage = '';
    zoomLayer.append(zoomImage);
    gesture.append(zoomLayer);
    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(gesture, { pointerId: 2, clientX: 300, clientY: 100 });
    act(() => vi.advanceTimersByTime(20));
    fireEvent.pointerUp(gesture, { pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 1, clientX: 100, clientY: 100 });

    fireEvent.pointerDown(gesture, { pointerId: 3, clientX: 150, clientY: 150 });
    fireEvent.pointerMove(gesture, { pointerId: 3, clientX: 350, clientY: 150 });
    act(() => vi.advanceTimersByTime(20));

    expect(gesture.style.transform).toBe('');
    expect(image.style.opacity).toBe('0');
    expect(zoomLayer.style.opacity).toBe('1');
    expect(zoomLayer.style.pointerEvents).toBe('auto');
    expect(zoomImage.style.transform).toBe('translate3d(20px, -200px, 0) scale(2)');

    fireEvent.pointerUp(gesture, { pointerId: 3, clientX: 350, clientY: 150 });

    expect(zoomImage.style.transform).toBe('translate3d(0px, -200px, 0) scale(2)');
    expect(zoomImage.style.transition).toBe('transform 180ms ease-out');

    act(() => vi.advanceTimersByTime(180));
    expect(zoomImage.style.transition).toBe('');
  });

  it('사진 끝에서 시작한 새로운 스와이프로 다음 사진을 선택한다', () => {
    const image = document.createElement('img');
    const onEdgeNavigate = vi.fn(() => {
      image.removeAttribute('data-photo-viewer-active-image');
    });
    render(<ZoomHarness onPinchStart={vi.fn()} onEdgeNavigate={onEdgeNavigate} />);
    const gesture = screen.getByTestId('gesture');
    Object.defineProperty(gesture, 'setPointerCapture', { value: vi.fn() });
    gesture.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);
    image.dataset.photoViewerActiveImage = 'true';
    Object.defineProperties(image, {
      naturalWidth: { value: 300 },
      naturalHeight: { value: 200 },
    });
    image.getBoundingClientRect = () => new DOMRect(0, 100, 300, 200);
    gesture.append(image);
    const zoomLayer = document.createElement('div');
    zoomLayer.dataset.photoViewerZoomLayer = '';
    const zoomImage = document.createElement('img');
    zoomImage.dataset.photoViewerZoomImage = '';
    zoomLayer.append(zoomImage);
    gesture.append(zoomLayer);
    const nextPreview = document.createElement('div');
    nextPreview.dataset.photoViewerEdgePreview = 'next';
    gesture.append(nextPreview);
    const carouselTrack = document.createElement('div');
    carouselTrack.dataset.photoViewerCarouselTrack = '';
    carouselTrack.style.columnGap = '12px';
    gesture.append(carouselTrack);

    fireEvent.pointerDown(gesture, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(gesture, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(gesture, { pointerId: 2, clientX: 300, clientY: 100 });
    act(() => vi.advanceTimersByTime(20));
    fireEvent.pointerUp(gesture, { pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(gesture, { pointerId: 1, clientX: 100, clientY: 100 });

    fireEvent.pointerDown(gesture, { pointerId: 3, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(gesture, { pointerId: 3, clientX: -100, clientY: 150 });
    act(() => vi.advanceTimersByTime(20));
    fireEvent.pointerUp(gesture, { pointerId: 3, clientX: -100, clientY: 150 });
    act(() => vi.advanceTimersByTime(180));

    expect(onEdgeNavigate).not.toHaveBeenCalled();

    fireEvent.pointerDown(gesture, { pointerId: 4, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(gesture, { pointerId: 4, clientX: 140, clientY: 150 });
    act(() => vi.advanceTimersByTime(20));

    expect(nextPreview.style.opacity).toBe('1');
    expect(nextPreview.style.transform).toBe('translate3d(252px, 0, 0)');

    fireEvent.pointerUp(gesture, { pointerId: 4, clientX: 140, clientY: 150 });

    expect(onEdgeNavigate).not.toHaveBeenCalled();
    expect(nextPreview.style.transform).toBe('translate3d(0, 0, 0)');

    act(() => vi.advanceTimersByTime(180));
    expect(onEdgeNavigate).toHaveBeenCalledWith('next');

    act(() => vi.advanceTimersByTime(20));
    expect(image.style.opacity).toBe('');
    expect(zoomImage.style.transform).toBe('');
    expect(zoomLayer.style.pointerEvents).toBe('');
  });
});
