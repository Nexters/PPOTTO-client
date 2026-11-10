import {
  useEffect,
  useRef,
  type Dispatch,
  type PointerEvent,
  type RefObject,
  type SetStateAction,
} from 'react';

import { computeBoardPinchZoom, panCamera, zoomCamera, type CameraState } from './board-camera';
import type { Point } from './geometry';

// 탭과 드래그를 구분하는 이동 허용 오차(px) — 보드 화면(use-camera-sticker-gesture)과 같은 값
const TAP_MOVE_THRESHOLD = 6;

type UseViewOnlyBoardGestureParams = {
  containerRef: RefObject<HTMLDivElement | null>;
  camera: CameraState;
  setCamera: Dispatch<SetStateAction<CameraState>>;
  // 끌거나 핀치하지 않고 탭으로 끝났을 때 처음 누른 대상을 넘긴다
  onTap: (target: EventTarget | null) => void;
};

function toLocalPoint(container: HTMLElement, event: { clientX: number; clientY: number }): Point {
  const rect = container.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function measurePinch(points: Point[]) {
  const [a, b] = points as [Point, Point];
  return {
    centroid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.hypot(a.x - b.x, a.y - b.y),
  };
}

// 편집 없이 보드를 끌어 이동하고, 핀치·휠로 확대·축소하는 제스처 — 공유 웹 페이지용.
// 카메라 계산은 보드 화면과 같은 함수를 써서 손에 붙는 느낌을 맞춘다.
export function useViewOnlyBoardGesture({
  containerRef,
  camera,
  setCamera,
  onTap,
}: UseViewOnlyBoardGestureParams) {
  const cameraRef = useRef(camera);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{
    base: CameraState;
    start: ReturnType<typeof measurePinch>;
  } | null>(null);
  const tapRef = useRef<{ start: Point; target: EventTarget | null } | null>(null);

  useEffect(() => {
    cameraRef.current = camera;
  });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.setPointerCapture?.(event.pointerId);
    const point = toLocalPoint(container, event);
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 1) {
      tapRef.current = { start: point, target: event.target };
      return;
    }
    tapRef.current = null;
    if (pointersRef.current.size === 2) {
      pinchRef.current = {
        base: cameraRef.current,
        start: measurePinch([...pointersRef.current.values()]),
      };
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointersRef.current.get(event.pointerId);
    if (!previous) return;
    const point = toLocalPoint(event.currentTarget, event);
    pointersRef.current.set(event.pointerId, point);

    const tap = tapRef.current;
    if (tap && Math.hypot(point.x - tap.start.x, point.y - tap.start.y) > TAP_MOVE_THRESHOLD) {
      tapRef.current = null;
    }

    const pinch = pinchRef.current;
    if (pinch) {
      const current = measurePinch([...pointersRef.current.values()]);
      setCamera(computeBoardPinchZoom(pinch.base, pinch.start, current));
      return;
    }
    setCamera((current) =>
      panCamera(current, { x: point.x - previous.x, y: point.y - previous.y }),
    );
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.delete(event.pointerId)) return;
    // 핀치 중 한 손가락을 떼면 남은 손가락으로 이어서 끈다
    if (pointersRef.current.size < 2) pinchRef.current = null;

    const tap = tapRef.current;
    tapRef.current = null;
    if (pointersRef.current.size === 0 && tap) onTap(tap.target);
  };

  // React의 onWheel은 passive라 브라우저 확대를 막을 수 없어 직접 등록한다
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey) {
        const pointer = toLocalPoint(container, event);
        setCamera((current) => zoomCamera(current, pointer, event.deltaY));
        return;
      }
      setCamera((current) => panCamera(current, { x: event.deltaX, y: event.deltaY }));
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, setCamera]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };
}
