import { useEffect, useRef, useState } from 'react';

import { fetchPhotoPage, requestPhotoLibraryPermission } from '../api/fetch-photo-page';

import type { GalleryPhoto } from './gallery-photo';
import { loadPhotoGroups } from './load-photo-groups';
import { photoCompressionQueue } from './photo-compression-queue';
import {
  createSelection,
  excludeAllGroups,
  excludeRepresentative,
  type PhotoSelection,
  type PhotoUnit,
  restoreGroup,
  unitCount,
  units,
} from './photo-group';

interface UsePhotoSelectionOptions {
  album: string;
  targetUnits: number;
  minSubmitUnits: number;
  mode: PhotoSelectionMode;
}

type PhotoSelectionMode = 'initial' | 'additional';

const asSinglePhotoGroups = (photos: GalleryPhoto[]) =>
  photos.map((photo) => ({ id: photo.id, photos: [photo] }));

export function usePhotoSelection({
  album,
  targetUnits,
  minSubmitUnits,
  mode,
}: UsePhotoSelectionOptions) {
  const [selection, setSelection] = useState<PhotoSelection | null>(null);
  const [endCursor, setEndCursor] = useState<string>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const loadGeneration = useRef(0);
  const reloading = useRef(false);
  const loadingMore = useRef(false);

  useEffect(() => {
    const generation = ++loadGeneration.current;
    let cancelled = false;
    reloading.current = true;
    loadingMore.current = false;

    const load = async () => {
      try {
        if (!(await requestPhotoLibraryPermission())) return;

        if (mode === 'initial') {
          const groups = await loadPhotoGroups({ fetchPage: fetchPhotoPage, targetUnits });
          if (cancelled) return;

          setSelection(createSelection(groups));
          setEndCursor(undefined);
          setHasNextPage(false);
          photoCompressionQueue.start(groups);
          return;
        }

        const page = await fetchPhotoPage({ first: targetUnits });
        if (cancelled) return;

        const groups = asSinglePhotoGroups(page.assets);
        setSelection(excludeAllGroups(createSelection(groups)));
        setEndCursor(page.endCursor);
        setHasNextPage(page.hasNextPage);
      } finally {
        if (!cancelled && loadGeneration.current === generation) reloading.current = false;
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [album, mode, targetUnits]);

  const photoUnits = selection ? units(selection) : [];
  const selectedCount = selection ? unitCount(selection) : 0;
  const everythingSelected =
    selection !== null &&
    selectedCount > 0 &&
    (mode === 'initial'
      ? selectedCount === selection.groups.length
      : selectedCount === targetUnits ||
        (!hasNextPage && selectedCount === selection.groups.length));

  const toggleUnit = (unit: PhotoUnit) => {
    setSelection((previous) => {
      if (!previous) return previous;

      if (mode === 'additional') {
        if (!unit.excluded) return excludeRepresentative(previous, unit.groupId);
        if (unitCount(previous) >= targetUnits) return previous;
      }

      return unit.excluded
        ? restoreGroup(previous, unit.groupId)
        : excludeRepresentative(previous, unit.groupId);
    });
  };

  const toggleEverything = () => {
    setSelection((previous) => {
      if (!previous) return previous;

      if (everythingSelected) return excludeAllGroups(previous);
      if (mode === 'initial') return createSelection(previous.groups);

      return {
        groups: previous.groups,
        excludedCounts: Object.fromEntries(
          previous.groups.map((group, index) => [group.id, index < targetUnits ? 0 : 1]),
        ),
      };
    });
  };

  const loadMore = async () => {
    if (
      mode !== 'additional' ||
      reloading.current ||
      !hasNextPage ||
      !endCursor ||
      loadingMore.current
    )
      return;

    const generation = loadGeneration.current;
    loadingMore.current = true;
    try {
      const page = await fetchPhotoPage({ first: targetUnits, after: endCursor });
      if (generation !== loadGeneration.current) return;

      setSelection((previous) => {
        if (!previous) return previous;

        const loadedIds = new Set(previous.groups.map((group) => group.id));
        const newGroups = asSinglePhotoGroups(
          page.assets.filter((photo) => !loadedIds.has(photo.id)),
        );

        return {
          groups: [...previous.groups, ...newGroups],
          excludedCounts: {
            ...previous.excludedCounts,
            ...Object.fromEntries(newGroups.map((group) => [group.id, 1])),
          },
        };
      });
      setEndCursor(page.endCursor);
      setHasNextPage(page.hasNextPage);
    } finally {
      if (generation === loadGeneration.current) loadingMore.current = false;
    }
  };

  return {
    canSubmit: selectedCount >= minSubmitUnits,
    everythingSelected,
    loadMore,
    photoUnits,
    selection,
    selectedCount,
    toggleEverything,
    toggleUnit,
  };
}
