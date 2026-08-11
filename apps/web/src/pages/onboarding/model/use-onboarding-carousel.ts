'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';

export function useOnboardingCarousel(slideCount: number) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;

    const syncSelectedIndex = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    syncSelectedIndex();
    emblaApi.on('select', syncSelectedIndex).on('reInit', syncSelectedIndex);

    return () => {
      emblaApi.off('select', syncSelectedIndex).off('reInit', syncSelectedIndex);
    };
  }, [emblaApi]);

  const goNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const goPrevious = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);

  return {
    emblaRef,
    selectedIndex,
    isLastSlide: selectedIndex === slideCount - 1,
    goNext,
    goPrevious,
  };
}
