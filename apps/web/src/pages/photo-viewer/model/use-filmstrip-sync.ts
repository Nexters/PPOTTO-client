import { useEffect, useLayoutEffect, useRef } from 'react';

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

export function useFilmstripSync(selectedIndex: number, onSelect: (index: number) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isFirstSyncRef = useRef(true);
  // 필름스트립 자체 스크롤이면 관성 스크롤과 안 겹치게 auto로 이동
  const isOwnScrollUpdateRef = useRef(false);

  // 아래 리스너는 마운트 시 한 번만 등록되므로, 최신 selectedIndex/onSelect는 ref로 읽음
  const selectedIndexRef = useRef(selectedIndex);
  const onSelectRef = useRef(onSelect);
  useLayoutEffect(() => {
    selectedIndexRef.current = selectedIndex;
    onSelectRef.current = onSelect;
  });

  useLayoutEffect(() => {
    const behavior = isFirstSyncRef.current || isOwnScrollUpdateRef.current ? 'auto' : 'smooth';
    isFirstSyncRef.current = false;
    isOwnScrollUpdateRef.current = false;

    const container = containerRef.current;
    const item = itemRefs.current[selectedIndex];
    if (!container || !item) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    container.scrollTo({
      left:
        container.scrollLeft +
        itemRect.left -
        containerRect.left -
        (container.clientWidth - item.clientWidth) / 2,
      behavior,
    });
  }, [selectedIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollEndTimer: ReturnType<typeof setTimeout>;

    const handleScrollEnd = () => {
      const closestIndex = findClosestIndex(container, itemRefs.current);
      if (closestIndex !== selectedIndexRef.current) {
        isOwnScrollUpdateRef.current = true;
        onSelectRef.current(closestIndex);
      }
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
  }, []);

  const getItemRef = (index: number) => (el: HTMLButtonElement | null) => {
    itemRefs.current[index] = el;
  };

  return { containerRef, getItemRef };
}
