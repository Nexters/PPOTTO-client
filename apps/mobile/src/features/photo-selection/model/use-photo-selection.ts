import { useEffect, useState } from 'react';

import { fetchPhotoPage } from '../api/fetch-photo-page';

import { loadPhotoGroups } from './load-photo-groups';
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
}

export function usePhotoSelection({
  album,
  targetUnits,
  minSubmitUnits,
}: UsePhotoSelectionOptions) {
  const [selection, setSelection] = useState<PhotoSelection | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadPhotoGroups({ fetchPage: fetchPhotoPage, targetUnits }).then((groups) => {
      if (!cancelled) setSelection(createSelection(groups));
    });

    return () => {
      cancelled = true;
    };
  }, [album, targetUnits]);

  const photoUnits = selection ? units(selection) : [];
  const selectedCount = selection ? unitCount(selection) : 0;
  const everythingSelected = selection !== null && selectedCount === selection.groups.length;

  const toggleUnit = (unit: PhotoUnit) => {
    setSelection((previous) => {
      if (!previous) return previous;

      return unit.excluded
        ? restoreGroup(previous, unit.groupId)
        : excludeRepresentative(previous, unit.groupId);
    });
  };

  const toggleEverything = () => {
    setSelection((previous) => {
      if (!previous) return previous;

      return everythingSelected ? excludeAllGroups(previous) : createSelection(previous.groups);
    });
  };

  return {
    canSubmit: selectedCount >= minSubmitUnits,
    everythingSelected,
    photoUnits,
    selectedCount,
    toggleEverything,
    toggleUnit,
  };
}
