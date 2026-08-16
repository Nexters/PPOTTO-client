import { useEffect, useRef } from 'react';

const LONG_PRESS_DELAY_MS = 500;
const MOVE_CANCEL_THRESHOLD_PX = 10;

type Point = { x: number; y: number };

type UseLongPressOptions = {
  onLongPress: (targetId: string) => void;
  onPressEnd?: () => void;
};

export function useLongPress({ onLongPress, onPressEnd }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPointRef = useRef<Point | null>(null);

  const cancel = () => {
    const wasPending = timerRef.current !== null;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPointRef.current = null;
    if (wasPending) onPressEnd?.();
  };

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
      startPointRef.current = null;
    },
    [],
  );

  const start = (point: Point, targetId: string) => {
    cancel();
    startPointRef.current = point;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      startPointRef.current = null;
      onLongPress(targetId);
    }, LONG_PRESS_DELAY_MS);
  };

  const move = (point: Point) => {
    if (!startPointRef.current) return;
    const distance = Math.hypot(
      point.x - startPointRef.current.x,
      point.y - startPointRef.current.y,
    );
    if (distance > MOVE_CANCEL_THRESHOLD_PX) cancel();
  };

  return { start, move, cancel };
}
