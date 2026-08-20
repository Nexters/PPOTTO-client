import { describe, expect, test } from 'vitest';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';

import {
  buildDisplayList,
  buildExpandedDisplayList,
  findFlatIndex,
  getAdjacentSelection,
  resolveFilmstripSelection,
} from './photo-selection';

type GroupMember = NonNullable<StickerPhoto['groupPhotos']>[number];

function photo(overrides: Partial<StickerPhoto> = {}): StickerPhoto {
  return {
    id: 'p',
    imageUrl: '/mock/photo.png',
    takenAt: '2026-01-01T00:00:00+09:00',
    group: false,
    groupId: null,
    groupPhotos: [],
    ...overrides,
  };
}

function groupMember(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: 'g',
    imageUrl: '/mock/photo.png',
    takenAt: '2026-01-01T00:00:00+09:00',
    ...overrides,
  };
}

// p1(단일) - p2(그룹, g1/g2/g3) - p3(단일) 순서의 공용 픽스처
function photosWithMiddleGroup(): StickerPhoto[] {
  return [
    photo({ id: 'p1' }),
    photo({
      id: 'p2',
      group: true,
      groupPhotos: [
        groupMember({ id: 'g1' }),
        groupMember({ id: 'g2' }),
        groupMember({ id: 'g3' }),
      ],
    }),
    photo({ id: 'p3' }),
  ];
}

describe('buildDisplayList', () => {
  test('그룹이 없는 사진은 subIndex 0, groupPosition "none"으로 표시된다', () => {
    const result = buildDisplayList([photo({ id: 'p1' })], 0);

    expect(result).toEqual([
      expect.objectContaining({ id: 'p1', topIndex: 0, subIndex: 0, groupPosition: 'none' }),
    ]);
  });

  test('그룹이 있지만 활성 그룹이 아니면 대표 사진만 collapsed로 표시된다', () => {
    const photos = photosWithMiddleGroup();

    const result = buildDisplayList(photos, 0); // activeTopIndex=0, 그룹은 topIndex 1

    expect(result).toEqual([
      expect.objectContaining({ id: 'p1', topIndex: 0, groupPosition: 'none' }),
      expect.objectContaining({ id: 'p2', topIndex: 1, subIndex: 0, groupPosition: 'collapsed' }),
      expect.objectContaining({ id: 'p3', topIndex: 2, groupPosition: 'none' }),
    ]);
  });

  test('활성 그룹은 대표 사진과 멤버가 모두 펼쳐지고, 마지막 멤버만 "last"로 표시된다', () => {
    const photos = photosWithMiddleGroup();

    const result = buildDisplayList(photos, 1); // activeTopIndex=1

    expect(result).toEqual([
      expect.objectContaining({ id: 'p1', topIndex: 0, subIndex: 0, groupPosition: 'none' }),
      expect.objectContaining({ id: 'p2', topIndex: 1, subIndex: 0, groupPosition: 'first' }),
      expect.objectContaining({ id: 'g1', topIndex: 1, subIndex: 1, groupPosition: 'middle' }),
      expect.objectContaining({ id: 'g2', topIndex: 1, subIndex: 2, groupPosition: 'middle' }),
      expect.objectContaining({ id: 'g3', topIndex: 1, subIndex: 3, groupPosition: 'last' }),
      expect.objectContaining({ id: 'p3', topIndex: 2, subIndex: 0, groupPosition: 'none' }),
    ]);
  });
});

describe('buildExpandedDisplayList', () => {
  test('큰 사진 캐러셀에서는 모든 그룹 사진을 항상 고정된 순서로 펼친다', () => {
    const result = buildExpandedDisplayList(photosWithMiddleGroup());

    expect(result.map(({ id, topIndex, subIndex }) => ({ id, topIndex, subIndex }))).toEqual([
      { id: 'p1', topIndex: 0, subIndex: 0 },
      { id: 'p2', topIndex: 1, subIndex: 0 },
      { id: 'g1', topIndex: 1, subIndex: 1 },
      { id: 'g2', topIndex: 1, subIndex: 2 },
      { id: 'g3', topIndex: 1, subIndex: 3 },
      { id: 'p3', topIndex: 2, subIndex: 0 },
    ]);
  });
});

describe('findFlatIndex', () => {
  test('topIndex/subIndex가 일치하는 항목의 위치를 반환한다', () => {
    const displayList = buildDisplayList(photosWithMiddleGroup(), 0);

    expect(findFlatIndex(displayList, { topIndex: 2, subIndex: 0 })).toBe(2);
  });

  test('일치하는 항목이 없으면 0을 반환한다', () => {
    const displayList = buildDisplayList([photo({ id: 'p1' })], 0);

    expect(findFlatIndex(displayList, { topIndex: 9, subIndex: 0 })).toBe(0);
  });
});

describe('resolveFilmstripSelection', () => {
  test('일반 사진 위치를 탭하면 그 사진이 그대로 선택된다', () => {
    const photos = photosWithMiddleGroup();

    const result = resolveFilmstripSelection(photos, { topIndex: 0, subIndex: 0 }, 2);

    expect(result).toEqual({ topIndex: 2, subIndex: 0 });
  });

  test('앞(왼쪽)에서 안 열린 그룹으로 진입하면 대표 사진이 선택된다', () => {
    const photos = photosWithMiddleGroup();

    // topIndex 0(p1)에서 오른쪽에 있는 그룹(flatIndex 1)으로 이동
    const result = resolveFilmstripSelection(photos, { topIndex: 0, subIndex: 0 }, 1);

    expect(result).toEqual({ topIndex: 1, subIndex: 0 });
  });

  test('뒤(오른쪽)에서 안 열린 그룹으로 진입하면 그룹의 마지막 사진이 선택된다', () => {
    const photos = photosWithMiddleGroup();

    // topIndex 2(p3)에서 왼쪽에 있는 그룹(flatIndex 1)으로 이동
    const result = resolveFilmstripSelection(photos, { topIndex: 2, subIndex: 0 }, 1);

    expect(result).toEqual({ topIndex: 1, subIndex: 3 });
  });

  test('존재하지 않는 위치로 이동하려 하면 기존 선택을 그대로 유지한다', () => {
    const photos = photosWithMiddleGroup();

    const result = resolveFilmstripSelection(photos, { topIndex: 0, subIndex: 0 }, 99);

    expect(result).toEqual({ topIndex: 0, subIndex: 0 });
  });
});

describe('getAdjacentSelection', () => {
  test('그룹 내부에서는 다음/이전 멤버로 이동한다', () => {
    const photos = photosWithMiddleGroup();

    const result = getAdjacentSelection(photos, { topIndex: 1, subIndex: 1 }, 1);

    expect(result).toEqual({ topIndex: 1, subIndex: 2 });
  });

  test('그룹의 마지막 멤버에서 다음으로 이동하면 다음 top-level 사진으로 넘어간다', () => {
    const photos = photosWithMiddleGroup();

    const result = getAdjacentSelection(photos, { topIndex: 1, subIndex: 3 }, 1);

    expect(result).toEqual({ topIndex: 2, subIndex: 0 });
  });

  test('이전으로 이동하다 안 열린 그룹에 들어가면 그룹의 마지막 사진이 선택된다', () => {
    const photos = photosWithMiddleGroup();

    const result = getAdjacentSelection(photos, { topIndex: 2, subIndex: 0 }, -1);

    expect(result).toEqual({ topIndex: 1, subIndex: 3 });
  });

  test('맨 처음 사진에서 이전으로 이동하면 선택이 그대로 유지된다', () => {
    const photos = photosWithMiddleGroup();

    const result = getAdjacentSelection(photos, { topIndex: 0, subIndex: 0 }, -1);

    expect(result).toEqual({ topIndex: 0, subIndex: 0 });
  });

  test('맨 마지막 사진에서 다음으로 이동하면 선택이 그대로 유지된다', () => {
    const photos = photosWithMiddleGroup();

    const result = getAdjacentSelection(photos, { topIndex: 2, subIndex: 0 }, 1);

    expect(result).toEqual({ topIndex: 2, subIndex: 0 });
  });
});
