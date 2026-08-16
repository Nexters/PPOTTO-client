import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  fetchPhotoPage,
  getPhotoLibraryPermission,
  presentPhotoLibraryPermissionPicker,
  requestPhotoLibraryPermission,
} from '../api/fetch-photo-page';

import type { GalleryPhoto } from './gallery-photo';
import {
  excludeAllGroups,
  excludeRepresentative,
  groupPhotos,
  type PhotoSelection,
  type PhotoSelectionChange,
  type PhotoUnit,
  restoreGroup,
  unitCount,
  units,
} from './photo-group';
import { PAGE_SIZES } from './photo-page';

interface UsePhotoSelectionOptions {
  album: string;
  targetUnits: number;
  minSubmitUnits: number;
  mode: PhotoSelectionMode;
}

/** 첫 업로드(initial)와 이후 업로드(additional)의 차이는 초기 자동선택 여부뿐이다. */
type PhotoSelectionMode = 'initial' | 'additional';

export function usePhotoSelection({
  album,
  targetUnits,
  minSubmitUnits,
  mode,
}: UsePhotoSelectionOptions) {
  const [selection, setSelection] = useState<PhotoSelection | null>(null);
  const [permission, setPermission] = useState<Awaited<
    ReturnType<typeof getPhotoLibraryPermission>
  > | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [endCursor, setEndCursor] = useState<string>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const loadKey = `${album}:${mode}:${targetUnits}:${reloadVersion}`;
  const [loadedKey, setLoadedKey] = useState<string>();
  const loadGeneration = useRef(0);
  const reloading = useRef(false);
  const loadingMore = useRef(false);
  const loadedPhotosRef = useRef<GalleryPhoto[]>([]);
  const loadedIdsRef = useRef(new Set<string>());
  const pageIndexRef = useRef(0);

  /**
   * 페이지를 덧붙일 때마다 누적 전체를 다시 그룹화한다. 마지막 그룹은 다음 페이지의 오래된
   * 사진이 합쳐질 수 있어 확정이 아니기 때문이다. 재그룹화는 숫자 배열 순회라 비용이 없다.
   *
   * 이미 화면에 있던 그룹은 사용자의 제외 상태를 유지하고, 새로 나타난 그룹에만 기본 상태를
   * 채운다 — 첫 업로드는 최신 targetUnits 그룹까지 자동선택, 그 외는 전부 제외.
   */
  const appendPhotos = (
    assets: GalleryPhoto[],
    previous: PhotoSelection | null,
  ): PhotoSelection => {
    const fresh = assets.filter((photo) => !loadedIdsRef.current.has(photo.id));
    fresh.forEach((photo) => loadedIdsRef.current.add(photo.id));
    loadedPhotosRef.current = [...loadedPhotosRef.current, ...fresh];

    const groups = groupPhotos(loadedPhotosRef.current);
    const previousLengths = new Map(
      (previous?.groups ?? []).map((group) => [group.id, group.photos.length]),
    );
    const excludedCounts: Record<string, number> = {};

    groups.forEach((group, index) => {
      const previousLength = previousLengths.get(group.id);

      if (previousLength === undefined) {
        if (mode !== 'initial' || index >= targetUnits) {
          excludedCounts[group.id] = group.photos.length;
        }
        return;
      }

      const previousCount = previous?.excludedCounts[group.id] ?? 0;
      // 페이지 경계에서 그룹이 사진을 더 흡수해도 '전부 제외'였던 그룹은 전부 제외로 유지한다
      const nextCount = previousCount >= previousLength ? group.photos.length : previousCount;
      if (nextCount > 0) excludedCounts[group.id] = nextCount;
    });

    return { groups, excludedCounts };
  };

  useEffect(() => {
    const generation = ++loadGeneration.current;
    let cancelled = false;
    reloading.current = true;
    loadingMore.current = false;
    loadedPhotosRef.current = [];
    loadedIdsRef.current = new Set();
    pageIndexRef.current = 0;

    const load = async () => {
      try {
        const nextPermission = await getPhotoLibraryPermission();
        if (cancelled) return;
        setPermission(nextPermission);
        if (!nextPermission.granted) return;

        const page = await fetchPhotoPage({ first: PAGE_SIZES[0] });
        if (cancelled) return;

        pageIndexRef.current = 1;
        setSelection(appendPhotos(page.assets, null));
        setEndCursor(page.endCursor);
        setHasNextPage(page.hasNextPage);
      } finally {
        if (!cancelled && loadGeneration.current === generation) {
          reloading.current = false;
          setLoadedKey(loadKey);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // appendPhotos는 이 훅의 로컬 클로저라 deps에 넣지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album, mode, reloadVersion, targetUnits]);

  const reload = useCallback(() => setReloadVersion((version) => version + 1), []);

  const requestPermission = useCallback(async () => {
    const nextPermission = await requestPhotoLibraryPermission();
    setPermission(nextPermission);
    if (nextPermission.granted) reload();
  }, [reload]);

  const presentPermissionPicker = useCallback(async () => {
    await presentPhotoLibraryPermissionPicker();
    reload();
  }, [reload]);

  useEffect(() => {
    if (permission?.status !== 'denied') return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });
    return () => subscription.remove();
  }, [permission?.status, reload]);

  const photoUnits = selection ? units(selection) : [];
  const selectedCount = photoUnits.filter((unit) => !unit.excluded).length;
  const everythingSelected =
    selection !== null &&
    selectedCount > 0 &&
    (selectedCount === targetUnits || (!hasNextPage && selectedCount === selection.groups.length));

  const toggleUnit = useCallback(
    (unit: PhotoUnit) => {
      setSelection((previous) => {
        if (!previous) return previous;
        if (!unit.excluded) return excludeRepresentative(previous, unit.groupId);
        // 제출 상한(targetUnits)을 넘겨서는 선택할 수 없다
        if (unitCount(previous) >= targetUnits) return previous;
        return restoreGroup(previous, unit.groupId);
      });
    },
    [targetUnits],
  );

  const toggleEverything = () => {
    setSelection((previous) => {
      if (!previous) return previous;
      if (everythingSelected) return excludeAllGroups(previous);

      // 최신 그룹부터 targetUnits개까지 선택한다
      return {
        groups: previous.groups,
        excludedCounts: Object.fromEntries(
          previous.groups.flatMap((group, index) =>
            index < targetUnits ? [] : [[group.id, group.photos.length] as const],
          ),
        ),
      };
    });
  };

  const setGroupExcludedCounts = useCallback(
    (changes: readonly PhotoSelectionChange[]) => {
      setSelection((previous) => {
        if (!previous) return previous;
        const groups = new Map(previous.groups.map((group) => [group.id, group]));
        const excludedCounts = { ...previous.excludedCounts };
        let selectedCount = unitCount(previous);
        let changed = false;

        changes.forEach((change) => {
          const group = groups.get(change.groupId);
          if (!group) return;
          const currentCount = excludedCounts[group.id] ?? 0;
          const nextCount = Math.max(0, Math.min(group.photos.length, change.excludedCount));
          if (currentCount === nextCount) return;

          const currentlySelected = currentCount < group.photos.length;
          const nextSelected = nextCount < group.photos.length;
          if (!currentlySelected && nextSelected && selectedCount >= targetUnits) return;

          excludedCounts[group.id] = nextCount;
          if (currentlySelected !== nextSelected) selectedCount += nextSelected ? 1 : -1;
          changed = true;
        });

        return changed ? { groups: previous.groups, excludedCounts } : previous;
      });
    },
    [targetUnits],
  );

  const loadMore = async () => {
    if (reloading.current || !hasNextPage || !endCursor || loadingMore.current) return;

    const generation = loadGeneration.current;
    loadingMore.current = true;
    try {
      const size = PAGE_SIZES[Math.min(pageIndexRef.current, PAGE_SIZES.length - 1)]!;
      const page = await fetchPhotoPage({ first: size, after: endCursor });
      if (generation !== loadGeneration.current) return;

      pageIndexRef.current += 1;
      setSelection((previous) => appendPhotos(page.assets, previous));
      setEndCursor(page.endCursor);
      setHasNextPage(page.hasNextPage);
    } finally {
      if (generation === loadGeneration.current) loadingMore.current = false;
    }
  };

  return {
    canSubmit: selectedCount >= minSubmitUnits,
    everythingSelected,
    loading: loadedKey !== loadKey,
    loadMore,
    permission,
    photoUnits,
    presentPermissionPicker,
    requestPermission,
    selection,
    selectedCount,
    setGroupExcludedCounts,
    toggleEverything,
    toggleUnit,
  };
}
