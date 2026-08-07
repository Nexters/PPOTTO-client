import type { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useRef } from 'react';

const LONG_PRESS_DELAY_MS = 500;
const MOVE_CANCEL_THRESHOLD_PX = 10;

type Point = { x: number; y: number };

function getPointerPosition(e: KonvaEventObject<MouseEvent | TouchEvent>): Point | null {
  return e.target.getStage()?.getPointerPosition() ?? null;
}

export function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPointRef = useRef<Point | null>(null);

  const cancel = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPointRef.current = null;
  };

  const start = (point: Point | null) => {
    if (!point) return;
    cancel();
    startPointRef.current = point;
    timerRef.current = setTimeout(() => {
      onLongPress();
      cancel();
    }, LONG_PRESS_DELAY_MS);
  };

  useEffect(() => cancel, []);

  const move = (point: Point | null) => {
    if (!point || !startPointRef.current) return;
    const distance = Math.hypot(
      point.x - startPointRef.current.x,
      point.y - startPointRef.current.y,
    );
    if (distance > MOVE_CANCEL_THRESHOLD_PX) cancel();
  };

  return {
    onMouseDown: (e: KonvaEventObject<MouseEvent>) => start(getPointerPosition(e)),
    onMouseMove: (e: KonvaEventObject<MouseEvent>) => move(getPointerPosition(e)),
    onMouseUp: cancel,
    onTouchStart: (e: KonvaEventObject<TouchEvent>) => start(getPointerPosition(e)),
    onTouchMove: (e: KonvaEventObject<TouchEvent>) => move(getPointerPosition(e)),
    onTouchEnd: cancel,
  };
}
