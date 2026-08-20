import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function usePhotoCarousel(selectedIndex: number, onSelect: (index: number) => void) {
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

  useEffect(() => {
    if (!carouselApi || carouselApi.selectedScrollSnap() === selectedIndex) return;
    carouselApi.scrollTo(selectedIndex);
  }, [carouselApi, selectedIndex]);

  return carouselRef;
}
