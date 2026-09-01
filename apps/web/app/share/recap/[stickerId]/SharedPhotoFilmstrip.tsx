'use client';

import Image from 'next/image';
import { useState } from 'react';

import type { DisplayItem } from '@/pages/photo-viewer/model/photo-selection';
import { useFilmstripSync } from '@/pages/photo-viewer/model/use-filmstrip-sync';
import { cn } from '@/shared/lib/cn';

type SharedPhotoFilmstripProps = {
  photos: DisplayItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function SharedPhotoFilmstrip({
  photos,
  selectedIndex,
  onSelect,
}: SharedPhotoFilmstripProps) {
  const expandedGroupTopIndex =
    photos.find((photo) => photo.groupPosition === 'first')?.topIndex ?? null;
  const expandedGroupLastSubIndex = photos.reduce(
    (lastSubIndex, photo) =>
      photo.topIndex === expandedGroupTopIndex
        ? Math.max(lastSubIndex, photo.subIndex)
        : lastSubIndex,
    0,
  );
  // 그룹 안에서 사진을 넘겨도 재생되지 않도록, 진입 방향은 그룹이 바뀐 순간에만 고정
  const [groupEntry, setGroupEntry] = useState<{
    expandedGroup: number | null;
    enterDirection: 'left' | 'right';
  }>({ expandedGroup: expandedGroupTopIndex, enterDirection: 'left' });
  if (groupEntry.expandedGroup !== expandedGroupTopIndex) {
    setGroupEntry({
      expandedGroup: expandedGroupTopIndex,
      enterDirection: (photos[selectedIndex]?.subIndex ?? 0) > 0 ? 'right' : 'left',
    });
  }
  const expandsFromRight = groupEntry.enterDirection === 'right';
  const { containerRef, getItemRef } = useFilmstripSync(
    selectedIndex,
    expandedGroupTopIndex,
    onSelect,
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex w-full items-center snap-x snap-mandatory overflow-x-auto scrollbar-none',
        'px-[calc(50%-24px)] pt-3',
      )}
      style={{
        paddingBottom:
          'calc(var(--rn-safe-area-inset-bottom, env(safe-area-inset-bottom)) + 0.75rem)',
      }}
    >
      {photos.map((photo, index) => {
        const isSelected = index === selectedIndex;
        const isGroupMember =
          photo.groupPosition === 'first' ||
          photo.groupPosition === 'middle' ||
          photo.groupPosition === 'last';
        const isNewlyExpandedMember =
          photo.groupPosition === 'middle' || photo.groupPosition === 'last';
        const revealOrder = expandsFromRight
          ? expandedGroupLastSubIndex - photo.subIndex
          : photo.subIndex - 1;
        const isTightGap = photo.groupPosition === 'first' || photo.groupPosition === 'middle';

        if (isGroupMember) {
          const rounded =
            photo.groupPosition === 'first'
              ? 'rounded-l-8'
              : photo.groupPosition === 'last'
                ? 'rounded-r-8'
                : 'rounded-none';

          return (
            <button
              key={photo.id}
              ref={getItemRef(index)}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                'relative h-12 w-12 shrink-0 snap-center overflow-hidden',
                rounded,
                isTightGap ? 'mr-px' : 'mr-2',
                'border transition-colors duration-200',
                isNewlyExpandedMember && 'filmstrip-group-member-enter',
                isSelected ? 'border-white' : 'border-transparent',
              )}
              style={
                isNewlyExpandedMember
                  ? { animationDelay: `${Math.min(Math.max(revealOrder, 0), 5) * 34}ms` }
                  : undefined
              }
              data-enter-direction={expandsFromRight ? 'right' : 'left'}
            >
              <Image src={photo.imageUrl} alt="" fill sizes="48px" className="object-cover" />
            </button>
          );
        }

        return (
          <button
            key={photo.id}
            ref={getItemRef(index)}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              'relative mr-2 shrink-0 snap-center',
              'overflow-hidden rounded-sm transition-[height,width] duration-200',
              isSelected ? 'z-10 h-12.5 w-12.5' : 'h-10 w-10',
            )}
          >
            <Image src={photo.imageUrl} alt="" fill sizes="40px" className="object-cover" />
          </button>
        );
      })}
    </div>
  );
}
