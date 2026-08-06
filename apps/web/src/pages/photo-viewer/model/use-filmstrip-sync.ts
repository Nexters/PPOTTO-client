import { useEffect, useRef } from 'react';

// scrollend는 구형 WebView 미지원 → scroll로 대체
const SCROLL_END_DELAY_MS = 100;

function findClosestIndex(container: HTMLDivElement, items: (HTMLButtonElement | null)[]) {
  const containerRect = container.getBoundingClientRect();
  const containerCenter = containerRect.left + containerRect.width / 2;

  let closestIndex = 0;
  let minDistance = Infinity;
  items.forEach((item, index) => {
    if (!item) return;
    const itemRect = item.getBoundingClientRect();
    const itemCenter = itemRect.left + itemRect.width / 2;
    const distance = Math.abs(itemCenter - containerCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

// 필름스트립과 selectedIndex를 양방향으로 동기화
export function useFilmstripSync(selectedIndex: number, onSelect: (index: number) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const skipAnimationRef = useRef(true);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({
      behavior: skipAnimationRef.current ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
    skipAnimationRef.current = false;
  }, [selectedIndex]);

  // 위 effect의 스크롤도 감지되지만 같은 인덱스라 재호출 없음
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollEndTimer: ReturnType<typeof setTimeout>;

    const handleScrollEnd = () => {
      const closestIndex = findClosestIndex(container, itemRefs.current);
      if (closestIndex !== selectedIndex) onSelect(closestIndex);
    };

    const handleScroll = () => {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(handleScrollEnd, SCROLL_END_DELAY_MS);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollEndTimer);
    };
  }, [selectedIndex, onSelect]);

  const getItemRef = (index: number) => (el: HTMLButtonElement | null) => {
    itemRefs.current[index] = el;
  };

  return { containerRef, getItemRef };
}
