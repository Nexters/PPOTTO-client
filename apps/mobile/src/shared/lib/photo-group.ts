import type { GalleryPhoto } from './photo';

/** 근접 촬영으로 볼 시간 창. PRD 초기 가설값이며 실사용 데이터로 조정한다. */
export const GROUP_WINDOW_MS = 5 * 60_000;

/** 그룹이 담는 최대 장수. 리캡 열람용 이미지 전송량을 묶기 위한 상한이다. */
export const MAX_GROUP_PHOTOS = 10;

export interface PhotoGroup {
  /** 대표가 바뀌어도 변하지 않는 식별자. */
  id: string;
  /** 촬영 시각 오름차순. photos[0]이 대표다. */
  photos: GalleryPhoto[];
}

export interface PhotoSelection {
  groups: PhotoGroup[];
  /** 그룹 id → 앞에서 제외된 장수. photos.length면 그룹 전체가 제외된 상태다. */
  excludedCounts: Readonly<Record<string, number>>;
}

export interface PhotoUnit {
  groupId: string;
  /** 현재 대표. 제외된 그룹은 복구 대상인 첫 사진을 보여준다. */
  photo: GalleryPhoto;
  excluded: boolean;
}

/**
 * 최신 사진을 앵커로 잡고 그 이전 5분을 한 그룹으로 묶는다. 반환은 최신 그룹 우선.
 *
 * 창 안의 사진이 10장을 넘으면 앵커에 가까운 10장만 담고 나머지는 버린다. 버린 사진은
 * 다음 앵커가 되지 않는다 — 재앵커링을 허용하면 긴 연사가 여러 그룹으로 쪼개진다.
 */
export function groupPhotos(photos: GalleryPhoto[]): PhotoGroup[] {
  const newestFirst = [...photos].sort(
    (a, b) => b.creationTime - a.creationTime || a.id.localeCompare(b.id),
  );

  const groups: PhotoGroup[] = [];
  let cursor = 0;

  while (cursor < newestFirst.length) {
    const anchor = newestFirst[cursor]!;
    const windowStart = anchor.creationTime - GROUP_WINDOW_MS;
    const kept: GalleryPhoto[] = [];

    while (cursor < newestFirst.length) {
      const candidate = newestFirst[cursor]!;
      if (candidate.creationTime < windowStart) break;

      if (kept.length < MAX_GROUP_PHOTOS) kept.push(candidate);
      cursor += 1;
    }

    const oldestFirst = kept.reverse();
    groups.push({ id: oldestFirst[0]!.id, photos: oldestFirst });
  }

  return groups;
}

export function createSelection(groups: PhotoGroup[]): PhotoSelection {
  return { groups, excludedCounts: {} };
}

/** 대표를 제외한다. 마지막 사진까지 제외하면 그룹 전체가 분석 대상에서 빠진다. */
export function excludeRepresentative(selection: PhotoSelection, groupId: string): PhotoSelection {
  const group = selection.groups.find((g) => g.id === groupId);
  if (!group) return selection;

  const excluded = selection.excludedCounts[groupId] ?? 0;
  if (excluded >= group.photos.length) return selection;

  return {
    groups: selection.groups,
    excludedCounts: { ...selection.excludedCounts, [groupId]: excluded + 1 },
  };
}

/** 그룹을 진입 직후 상태로 돌린다. 첫 사진이 다시 대표가 된다. */
export function restoreGroup(selection: PhotoSelection, groupId: string): PhotoSelection {
  return {
    groups: selection.groups,
    excludedCounts: { ...selection.excludedCounts, [groupId]: 0 },
  };
}

/** 그리드에 그릴 항목. 그룹 순서(최신 우선)를 그대로 따른다. */
export function units(selection: PhotoSelection): PhotoUnit[] {
  return selection.groups.map((group) => {
    const excludedCount = selection.excludedCounts[group.id] ?? 0;
    const excluded = excludedCount >= group.photos.length;

    return {
      groupId: group.id,
      photo: excluded ? group.photos[0]! : group.photos[excludedCount]!,
      excluded,
    };
  });
}

export function unitCount(selection: PhotoSelection): number {
  return units(selection).filter((unit) => !unit.excluded).length;
}
