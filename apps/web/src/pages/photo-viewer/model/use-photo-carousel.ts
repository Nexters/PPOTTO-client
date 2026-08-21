import useEmblaCarousel from 'embla-carousel-react';
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

export function usePhotoCarousel(
  selectedIndex: number,
  onSelect: (index: number) => void,
  jumpToSelectedRef: RefObject<boolean>,
) {
  const [initialIndex] = useState(selectedIndex);
  const [carouselRef, carouselApi] = useEmblaCarousel({
    align: 'start',
    containScroll: false,
    duration: 24,
    loop: false,
    startIndex: initialIndex,
  });
  const onSelectRef = useRef(onSelect);

  useLayoutEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    if (!carouselApi) return;

    const syncSelection = () => onSelectRef.current(carouselApi.selectedScrollSnap());
    carouselApi.on('select', syncSelection);
    return () => {
      carouselApi.off('select', syncSelection);
    };
  }, [carouselApi]);

  useLayoutEffect(() => {
    if (!carouselApi || carouselApi.selectedScrollSnap() === selectedIndex) return;
    const jump = jumpToSelectedRef.current;
    jumpToSelectedRef.current = false;
    carouselApi.scrollTo(selectedIndex, jump);
  }, [carouselApi, jumpToSelectedRef, selectedIndex]);

  return carouselRef;
}
