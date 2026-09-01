import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';

import {
  buildDisplayList,
  buildExpandedDisplayList,
  findFlatIndex,
  type PhotoSelection,
  resolveFilmstripSelection,
} from './photo-selection';
import type { ZoomEdgeDirection } from './photo-zoom';

type UsePhotoViewerSelectionOptions = {
  photos: StickerPhoto[];
  initialTopIndex: number;
  /** 확대 상태 초기화용 콜백 */
  onSelectionChange: () => void;
};

export function usePhotoViewerSelection({
  photos,
  initialTopIndex,
  onSelectionChange,
}: UsePhotoViewerSelectionOptions) {
  const [selection, setSelection] = useState<PhotoSelection>({
    topIndex: initialTopIndex,
    subIndex: 0,
  });
  const jumpCarouselSelectionRef = useRef(false);
  // resetZoom은 이 훅보다 나중에 생성되므로 ref로 최신값 참조
  const onSelectionChangeRef = useRef(onSelectionChange);

  useLayoutEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  });

  const filmstripPhotos = buildDisplayList(photos, selection.topIndex);
  const filmstripIndex = findFlatIndex(filmstripPhotos, selection);
  const carouselPhotos = buildExpandedDisplayList(photos);
  const carouselIndex = findFlatIndex(carouselPhotos, selection);

  const handleFilmstripSelect = (newFlatIndex: number) => {
    const nextSelection = resolveFilmstripSelection(photos, selection, newFlatIndex);
    if (
      nextSelection.topIndex !== selection.topIndex ||
      nextSelection.subIndex !== selection.subIndex
    ) {
      onSelectionChangeRef.current();
      setSelection(nextSelection);
    }
  };

  const handleCarouselSelect = (index: number) => {
    const photo = carouselPhotos[index];
    if (photo && (photo.topIndex !== selection.topIndex || photo.subIndex !== selection.subIndex)) {
      onSelectionChangeRef.current();
      setSelection({ topIndex: photo.topIndex, subIndex: photo.subIndex });
    }
  };

  const handleZoomEdgeNavigate = useCallback(
    (direction: ZoomEdgeDirection) => {
      const nextIndex = carouselIndex + (direction === 'next' ? 1 : -1);
      const photo = carouselPhotos[nextIndex];
      if (!photo) return;
      jumpCarouselSelectionRef.current = true;
      setSelection({ topIndex: photo.topIndex, subIndex: photo.subIndex });
    },
    [carouselIndex, carouselPhotos],
  );

  return {
    selection,
    filmstripPhotos,
    filmstripIndex,
    carouselPhotos,
    carouselIndex,
    jumpCarouselSelectionRef,
    handleFilmstripSelect,
    handleCarouselSelect,
    handleZoomEdgeNavigate,
  };
}
