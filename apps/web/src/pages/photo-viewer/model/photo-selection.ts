import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';

export type PhotoSelection = {
  topIndex: number;
  subIndex: number;
};

export type GroupPosition = 'none' | 'collapsed' | 'first' | 'middle' | 'last';

export type DisplayItem = {
  id: string;
  imageUrl: string;
  takenAt: string;
  topIndex: number;
  subIndex: number;
  groupPosition: GroupPosition;
};

export function buildDisplayList(photos: StickerPhoto[], activeTopIndex: number): DisplayItem[] {
  return photos.flatMap((photo, topIndex) => {
    const groupPhotos = photo.groupPhotos ?? [];
    const base = { id: photo.id, imageUrl: photo.imageUrl, takenAt: photo.takenAt, topIndex };

    if (groupPhotos.length === 0) {
      return [{ ...base, subIndex: 0, groupPosition: 'none' as const }];
    }

    if (topIndex !== activeTopIndex) {
      return [{ ...base, subIndex: 0, groupPosition: 'collapsed' as const }];
    }

    const representative: DisplayItem = { ...base, subIndex: 0, groupPosition: 'first' };
    const members: DisplayItem[] = groupPhotos.map((groupPhoto, index) => ({
      id: groupPhoto.id,
      imageUrl: groupPhoto.imageUrl,
      takenAt: groupPhoto.takenAt,
      topIndex,
      subIndex: index + 1,
      groupPosition: index === groupPhotos.length - 1 ? 'last' : 'middle',
    }));
    return [representative, ...members];
  });
}

// 캐러셀은 스와이프 중 목록 길이가 고정이어야 해서 항상 전체 펼침
export function buildExpandedDisplayList(photos: StickerPhoto[]): DisplayItem[] {
  return photos.flatMap((photo, topIndex) => {
    const base = {
      id: photo.id,
      imageUrl: photo.imageUrl,
      takenAt: photo.takenAt,
      topIndex,
      subIndex: 0,
      groupPosition: 'none' as const,
    };
    const members: DisplayItem[] = (photo.groupPhotos ?? []).map((groupPhoto, index) => ({
      id: groupPhoto.id,
      imageUrl: groupPhoto.imageUrl,
      takenAt: groupPhoto.takenAt,
      topIndex,
      subIndex: index + 1,
      groupPosition: 'none',
    }));

    return [base, ...members];
  });
}

export function findFlatIndex(displayList: DisplayItem[], selection: PhotoSelection): number {
  const index = displayList.findIndex(
    (item) => item.topIndex === selection.topIndex && item.subIndex === selection.subIndex,
  );
  return index === -1 ? 0 : index;
}

// 아직 안 열린 그룹으로 진입하면, 뒤(왼쪽)에서 들어갈 땐 그룹의 마지막 사진을, 앞에서 들어갈 땐 대표 사진을 선택
function resolveTarget(
  photos: StickerPhoto[],
  displayList: DisplayItem[],
  fromFlatIndex: number,
  toFlatIndex: number,
): PhotoSelection | null {
  const target = displayList[toFlatIndex];
  if (!target) return null;

  const direction = toFlatIndex >= fromFlatIndex ? 1 : -1;
  if (target.groupPosition === 'collapsed' && direction === -1) {
    const groupPhotos = photos[target.topIndex]?.groupPhotos ?? [];
    return { topIndex: target.topIndex, subIndex: groupPhotos.length };
  }

  return { topIndex: target.topIndex, subIndex: target.subIndex };
}

export function resolveFilmstripSelection(
  photos: StickerPhoto[],
  selection: PhotoSelection,
  toFlatIndex: number,
): PhotoSelection {
  const displayList = buildDisplayList(photos, selection.topIndex);
  const fromFlatIndex = findFlatIndex(displayList, selection);
  return resolveTarget(photos, displayList, fromFlatIndex, toFlatIndex) ?? selection;
}

export function getAdjacentSelection(
  photos: StickerPhoto[],
  selection: PhotoSelection,
  direction: 1 | -1,
): PhotoSelection {
  const displayList = buildDisplayList(photos, selection.topIndex);
  const flatIndex = findFlatIndex(displayList, selection);
  const newFlatIndex = flatIndex + direction;

  if (newFlatIndex < 0 || newFlatIndex >= displayList.length) return selection;

  return resolveTarget(photos, displayList, flatIndex, newFlatIndex) ?? selection;
}
