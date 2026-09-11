import { act, cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

import { type ParsedDrawing, toPathData } from './board-drawing';
import type { Point } from './geometry';
import { useDrawingSelection } from './use-drawing-selection';

vi.mock('@/shared/lib/bridge', () => ({ bridge: { send: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(camera = { x: 0, y: 0, scale: 1 }) {
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const drawingsRef = {
    current: [
      {
        id: 'line',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        strokeWidth: 2,
        color: '#fff',
        zIndex: 1,
      },
    ] as ParsedDrawing[],
  };
  const pointersRef = { current: new Map<number, Point>() };
  let hook: ReturnType<typeof useDrawingSelection>;
  let renders = 0;
  const apply = vi.fn();
  function Harness() {
    const [, refresh] = useState(0);
    renders++;
    hook = useDrawingSelection({
      isEditMode: true,
      cameraRef: { current: camera },
      pointersRef,
      drawingsRef,
      hitTestSticker: () => null,
      combinedZIndexPool: () => drawingsRef.current,
      setSelectedStickerId: vi.fn(),
      resetTextSelection: vi.fn(),
      applyDrawingChange: (id, overrides) => {
        apply(id, overrides);
        drawingsRef.current = drawingsRef.current.map((drawing) => ({ ...drawing, ...overrides }));
        refresh((value) => value + 1);
      },
      markDrawingDeleted: vi.fn(),
      moveDrawing: vi.fn(),
      deleteDrawing: vi.fn(),
    });
    return (
      <>
        <svg
          data-testid="drawing"
          ref={hook.selectedDrawingId ? hook.drawingPreviewElementRef : undefined}
        >
          <path d={toPathData(drawingsRef.current[0]!.points)} />
        </svg>
        {hook.selectedDrawingId && <div data-testid="box" ref={hook.drawingBoxPreviewElementRef} />}
      </>
    );
  }
  const view = render(<Harness />);
  const input = (kind: 'down' | 'move' | 'up' | 'cancel', id: number, x: number, y: number) =>
    act(() => {
      const point = { x, y };
      const event = {
        type: kind === 'cancel' ? 'pointercancel' : `pointer${kind}`,
        pointerId: id,
        clientX: x,
        clientY: y,
        target: null,
      } as PointerEvent;
      if (kind === 'up' || kind === 'cancel') {
        pointersRef.current.delete(id);
        hook.onPointerUp(event, point);
      } else {
        pointersRef.current.set(id, point);
        if (kind === 'down') hook.onPointerDown(event, point);
        else hook.onPointerMove(event, point);
      }
    });
  const flush = () =>
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(0));
    });
  input('down', 1, camera.x, camera.y);
  input('down', 2, camera.x + 10 * camera.scale, camera.y);
  apply.mockClear();
  return {
    ...view,
    input,
    flush,
    frames,
    apply,
    drawingsRef,
    renders: () => renders,
    reset: () => act(() => hook.resetSelection()),
  };
}

it('핀치 중 렌더/경로 변경 없이 프레임당 한 번 미리보고, 재핀치와 마지막 up 좌표까지 한 번 확정한다', () => {
  const t = setup();
  const renders = t.renders();
  const svg = t.getByTestId('drawing');
  const path = svg.querySelector('path')!.getAttribute('d');
  t.input('move', 2, 0, 15);
  t.input('move', 2, 0, 20); // 90도 회전, 2배 확대
  expect(t.frames.size).toBe(1);
  t.flush();
  expect(t.renders()).toBe(renders);
  expect(t.apply).not.toHaveBeenCalled();
  expect(svg.querySelector('path')!.getAttribute('d')).toBe(path);
  expect(svg.style.transform).toContain('rotate(90deg) scale(2)');
  expect(t.getByTestId('box').style.transform).toBe(svg.style.transform);
  expect(t.getByTestId('box').style.getPropertyValue('--inv-camera-scale')).toBe('0.5');

  t.input('up', 2, 0, 20);
  t.input('move', 1, 5, 7);
  t.input('down', 2, 15, 7);
  t.input('move', 2, 25, 7); // 드래그 후 다시 2배
  t.input('up', 2, 25, 7);
  expect(t.apply).not.toHaveBeenCalled();
  t.input('up', 1, 6, 8); // rAF 전에 떼어도 마지막 좌표까지 확정
  expect(t.apply).toHaveBeenCalledOnce();
  const drawing = t.drawingsRef.current[0]!;
  expect(drawing.points[0]!.x).toBeCloseTo(6);
  expect(drawing.points[0]!.y).toBeCloseTo(8);
  expect(drawing.points[1]!.x).toBeCloseTo(6);
  expect(drawing.points[1]!.y).toBeCloseTo(48);
  expect(drawing.strokeWidth).toBeCloseTo(8);
  expect(t.frames.size).toBe(0);
  expect(svg.style.transform).toBe('');
  expect(t.getByTestId('box').style.transform).toBe('');
});

it('선택 해제와 unmount는 예약된 프레임과 이전 SVG의 transform을 정리한다', () => {
  const t = setup();
  t.input('move', 2, 0, 20);
  t.flush();
  const svg = t.getByTestId('drawing');
  expect(svg.style.transform).not.toBe('');
  t.input('move', 2, 0, 25);
  t.reset();
  expect(t.frames.size).toBe(0);
  expect(svg.style.transform).toBe('');
  expect(t.apply).not.toHaveBeenCalled();
  t.unmount();
  const next = setup();
  next.input('move', 2, 0, 20);
  next.unmount();
  expect(next.frames.size).toBe(0);
});

it('카메라 확대 상태에서도 pointerup의 마지막 핀치 좌표로 선과 굵기를 확정한다', () => {
  const t = setup({ x: 30, y: 40, scale: 2 });
  t.input('move', 2, 30, 80);
  t.input('up', 2, 30, 100); // move 이후 더 움직인 최종 위치: 원본의 3배, 90도
  t.input('up', 1, 30, 40);
  const drawing = t.drawingsRef.current[0]!;
  expect(drawing.points[1]!.x).toBeCloseTo(0);
  expect(drawing.points[1]!.y).toBeCloseTo(30);
  expect(drawing.strokeWidth).toBe(6);
  expect(t.apply).toHaveBeenCalledOnce();
});

it('pointercancel은 취소 이벤트 좌표로 튀지 않고 마지막 미리보기를 확정한다', () => {
  const t = setup();
  t.input('move', 2, 0, 20);
  t.input('cancel', 2, 999, 999);
  t.input('cancel', 1, 999, 999);
  const drawing = t.drawingsRef.current[0]!;
  expect(drawing.points[1]!.x).toBeCloseTo(0);
  expect(drawing.points[1]!.y).toBeCloseTo(20);
  expect(t.frames.size).toBe(0);
  expect(t.apply).toHaveBeenCalledOnce();
});
