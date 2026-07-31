import { useRef } from 'react';

const SWIPE_THRESHOLD = 50;

// 좌우 스와이프로 selectedIndex를 이동
export function useSwipeNavigation(
  photoCount: number,
  setSelectedIndex: (updater: (prev: number) => number) => void,
) {
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
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (deltaX < -SWIPE_THRESHOLD) {
      setSelectedIndex((prev) => Math.min(prev + 1, photoCount - 1));
    }
  };

  return { onTouchStart, onTouchEnd };
}
