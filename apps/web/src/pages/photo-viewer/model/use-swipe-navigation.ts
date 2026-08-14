import { useRef } from 'react';

const SWIPE_THRESHOLD = 50;

export function useSwipeNavigation(onSwipe: (direction: 1 | -1) => void) {
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0]?.clientX;
    if (touchStartX.current === null || touchEndX === undefined) return;
    const deltaX = touchEndX - touchStartX.current;
    touchStartX.current = null;

    if (deltaX > SWIPE_THRESHOLD) {
      onSwipe(-1);
    } else if (deltaX < -SWIPE_THRESHOLD) {
      onSwipe(1);
    }
  };

  return { onTouchStart, onTouchEnd };
}
