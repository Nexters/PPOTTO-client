import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { type FlatList, type LayoutChangeEvent, useWindowDimensions, View } from 'react-native';
import Animated, {
  type FrameInfo,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { PhotoSelectionChange, PhotoUnit } from '../model/photo-group';

import { PhotoTile } from './PhotoTile';

const COLUMNS = 4;
const GAP = 2;
const INITIAL_TILES = 24;
const SKELETON_TILES = Array.from({ length: INITIAL_TILES }, (_, index) => index);
const NEXT_PAGE_THRESHOLD = 2;
const AUTO_SCROLL_EDGE = 96;
const AUTO_SCROLL_MAX_SPEED = 1_200;

function gridIndexAt(
  x: number,
  y: number,
  scrollOffset: number,
  width: number,
  height: number,
  tileWidth: number,
) {
  'worklet';
  if (!width || !height) return -1;

  const localX = Math.max(0, Math.min(width - 1, x));
  const localY = Math.max(0, Math.min(height - 1, y));
  const column = Math.min(COLUMNS - 1, Math.floor(localX / (tileWidth + GAP)));
  const row = Math.floor((localY + scrollOffset) / (tileWidth + GAP));
  return row * COLUMNS + column;
}

function autoScrollSpeedAt(y: number, height: number) {
  'worklet';
  const proximity =
    y < AUTO_SCROLL_EDGE
      ? -Math.min(1, (AUTO_SCROLL_EDGE - y) / AUTO_SCROLL_EDGE)
      : y > height - AUTO_SCROLL_EDGE
        ? Math.min(1, (y - height + AUTO_SCROLL_EDGE) / AUTO_SCROLL_EDGE)
        : 0;
  return proximity * AUTO_SCROLL_MAX_SPEED;
}

type IndexRange = readonly [start: number, end: number];

export function dragRangeDelta(anchor: number, previous: number, next: number) {
  const previousStart = Math.min(anchor, previous);
  const previousEnd = Math.max(anchor, previous);
  const nextStart = Math.min(anchor, next);
  const nextEnd = Math.max(anchor, next);
  const exited: IndexRange[] = [];
  const entered: IndexRange[] = [];

  if (previousStart < nextStart) {
    exited.push([previousStart, Math.min(previousEnd, nextStart - 1)]);
  }
  if (previousEnd > nextEnd) {
    exited.push([Math.max(previousStart, nextEnd + 1), previousEnd]);
  }
  if (nextStart < previousStart) {
    entered.push([nextStart, Math.min(nextEnd, previousStart - 1)]);
  }
  if (nextEnd > previousEnd) {
    entered.push([Math.max(nextStart, previousEnd + 1), nextEnd]);
  }

  return { entered, exited };
}

interface PhotoGridProps {
  bottomPadding: number;
  grouped: boolean;
  loading?: boolean;
  units: PhotoUnit[];
  onEndReached?: () => void;
  onDragChange: (changes: readonly PhotoSelectionChange[]) => void;
  onPress: (unit: PhotoUnit) => void;
}

const PhotoGridItem = memo(
  function PhotoGridItem({
    grouped,
    item,
    onPress,
    width,
  }: {
    grouped: boolean;
    item: PhotoUnit;
    onPress: (unit: PhotoUnit) => void;
    width: number;
  }) {
    return (
      <View style={{ width }}>
        <PhotoTile
          grouped={grouped}
          onPress={() => onPress(item)}
          photoCount={item.photoCount}
          selected={!item.excluded}
          uri={item.photo.uri}
        />
      </View>
    );
  },
  (previous, next) =>
    previous.grouped === next.grouped &&
    previous.item.excluded === next.item.excluded &&
    previous.item.groupId === next.item.groupId &&
    previous.item.photo.uri === next.item.photo.uri &&
    previous.item.photoCount === next.item.photoCount &&
    previous.onPress === next.onPress &&
    previous.width === next.width,
);

/** 선택 가능한 사진 단위를 4열 그리드로 표시한다. */
export function PhotoGrid({
  bottomPadding,
  grouped,
  loading = false,
  units,
  onEndReached,
  onDragChange,
  onPress,
}: PhotoGridProps) {
  const { width } = useWindowDimensions();
  const tileWidth = (width - GAP * (COLUMNS - 1)) / COLUMNS;
  const itemCount = units.length;
  const [dragging, setDragging] = useState(false);
  const listRef = useAnimatedRef<FlatList<PhotoUnit>>();
  const draggingRef = useRef(false);
  const desiredSelectedRef = useRef(false);
  const anchorIndexRef = useRef<number | undefined>(undefined);
  const currentIndexRef = useRef<number | undefined>(undefined);
  const originalExcludedCountsRef = useRef(new Map<string, number>());
  const groupLengthsRef = useRef(new Map<string, number>());
  const unitsRef = useRef(units);
  const onDragChangeRef = useRef(onDragChange);
  const dragActive = useSharedValue(false);
  const pointerX = useSharedValue(0);
  const pointerY = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const viewportWidth = useSharedValue(width);
  const viewportHeight = useSharedValue(0);
  const autoScrollSpeed = useSharedValue(0);
  const nativeIndex = useSharedValue(-1);

  useEffect(() => {
    unitsRef.current = units;
    onDragChangeRef.current = onDragChange;
  }, [onDragChange, units]);

  const updateDragRange = useCallback((nextIndex: number) => {
    const anchorIndex = anchorIndexRef.current;
    const currentIndex = currentIndexRef.current;
    if (anchorIndex === undefined || currentIndex === undefined || nextIndex === currentIndex)
      return;

    const { entered, exited } = dragRangeDelta(anchorIndex, currentIndex, nextIndex);
    const changes: PhotoSelectionChange[] = [];
    const appendChanges = (ranges: readonly IndexRange[], restoring: boolean) => {
      ranges.forEach(([start, end]) => {
        for (let index = start; index <= end; index += 1) {
          const unit = unitsRef.current[index];
          if (!unit) continue;

          if (!originalExcludedCountsRef.current.has(unit.groupId)) {
            originalExcludedCountsRef.current.set(unit.groupId, unit.excludedCount);
            groupLengthsRef.current.set(unit.groupId, unit.excludedCount + unit.photoCount);
          }

          const originalCount = originalExcludedCountsRef.current.get(unit.groupId)!;
          const groupLength = groupLengthsRef.current.get(unit.groupId)!;
          const originallySelected = originalCount < groupLength;
          if (originallySelected === desiredSelectedRef.current) continue;

          changes.push({
            groupId: unit.groupId,
            excludedCount: restoring ? originalCount : desiredSelectedRef.current ? 0 : groupLength,
          });
        }
      });
    };

    // 먼저 빠진 범위를 복원해야 선택 상한에 걸리지 않고 새 범위를 적용할 수 있다.
    appendChanges(exited, true);
    appendChanges(entered, false);
    currentIndexRef.current = nextIndex;
    if (changes.length) onDragChangeRef.current(changes);
  }, []);

  const handleDragStart = useCallback((index: number) => {
    const unit = unitsRef.current[index];
    if (!unit) return;

    draggingRef.current = true;
    desiredSelectedRef.current = unit.excluded;
    anchorIndexRef.current = index;
    currentIndexRef.current = index;
    originalExcludedCountsRef.current = new Map([[unit.groupId, unit.excludedCount]]);
    const groupLength = unit.excludedCount + unit.photoCount;
    groupLengthsRef.current = new Map([[unit.groupId, groupLength]]);
    setDragging(true);
    onDragChangeRef.current([
      { groupId: unit.groupId, excludedCount: unit.excluded ? 0 : groupLength },
    ]);
  }, []);

  const handleDragIndex = useCallback(
    (index: number) => {
      if (draggingRef.current) updateDragRange(index);
    },
    [updateDragRange],
  );

  const handleDragEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    anchorIndexRef.current = undefined;
    currentIndexRef.current = undefined;
    originalExcludedCountsRef.current.clear();
    groupLengthsRef.current.clear();
    setDragging(false);
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    viewportWidth.set(event.nativeEvent.layout.width);
    viewportHeight.set(event.nativeEvent.layout.height);
  };

  const handleScroll = useAnimatedScrollHandler((event) => {
    scrollOffset.set(event.contentOffset.y);
  });

  const handleAutoScrollFrame = useCallback(
    ({ timeSincePreviousFrame }: FrameInfo) => {
      'worklet';
      if (!dragActive.get() || !autoScrollSpeed.get()) return;

      const maxOffset = Math.max(0, contentHeight.get() - viewportHeight.get());
      const nextOffset = Math.max(
        0,
        Math.min(
          maxOffset,
          scrollOffset.get() +
            (autoScrollSpeed.get() * Math.min(timeSincePreviousFrame ?? 16, 32)) / 1_000,
        ),
      );
      if (nextOffset === scrollOffset.get()) {
        autoScrollSpeed.set(0);
        return;
      }

      scrollOffset.set(nextOffset);
      scrollTo(listRef, 0, nextOffset, false);
      const index = Math.min(
        itemCount - 1,
        gridIndexAt(
          pointerX.get(),
          pointerY.get(),
          nextOffset,
          viewportWidth.get(),
          viewportHeight.get(),
          tileWidth,
        ),
      );
      if (index !== nativeIndex.get()) {
        nativeIndex.set(index);
        scheduleOnRN(handleDragIndex, index);
      }
    },
    [
      autoScrollSpeed,
      contentHeight,
      dragActive,
      handleDragIndex,
      itemCount,
      listRef,
      nativeIndex,
      pointerX,
      pointerY,
      scrollOffset,
      tileWidth,
      viewportHeight,
      viewportWidth,
    ],
  );
  useFrameCallback(handleAutoScrollFrame);

  // RNGH stores these callbacks; it does not invoke them while rendering.
  /* eslint-disable react-hooks/refs */
  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(500)
        .onStart(({ x, y }) => {
          'worklet';
          const index = Math.min(
            itemCount - 1,
            gridIndexAt(
              x,
              y,
              scrollOffset.get(),
              viewportWidth.get(),
              viewportHeight.get(),
              tileWidth,
            ),
          );
          if (index < 0 || index >= itemCount) return;

          dragActive.set(true);
          pointerX.set(x);
          pointerY.set(y);
          nativeIndex.set(index);
          scheduleOnRN(handleDragStart, index);
        })
        .onUpdate(({ x, y }) => {
          'worklet';
          if (!dragActive.get()) return;
          pointerX.set(x);
          pointerY.set(y);
          autoScrollSpeed.set(autoScrollSpeedAt(y, viewportHeight.get()));

          const index = Math.min(
            itemCount - 1,
            gridIndexAt(
              x,
              y,
              scrollOffset.get(),
              viewportWidth.get(),
              viewportHeight.get(),
              tileWidth,
            ),
          );
          if (index !== nativeIndex.get()) {
            nativeIndex.set(index);
            scheduleOnRN(handleDragIndex, index);
          }
        })
        .onFinalize(() => {
          'worklet';
          if (!dragActive.get()) return;
          dragActive.set(false);
          autoScrollSpeed.set(0);
          scheduleOnRN(handleDragEnd);
        }),
    [
      autoScrollSpeed,
      dragActive,
      handleDragEnd,
      handleDragIndex,
      handleDragStart,
      itemCount,
      nativeIndex,
      pointerX,
      pointerY,
      scrollOffset,
      tileWidth,
      viewportHeight,
      viewportWidth,
    ],
  );
  /* eslint-enable react-hooks/refs */

  if (loading) {
    return (
      <View
        className="flex-1 flex-row flex-wrap content-start overflow-hidden"
        style={{ gap: GAP }}
      >
        {SKELETON_TILES.map((index) => (
          <View className="aspect-square bg-gray-800" key={index} style={{ width: tileWidth }} />
        ))}
      </View>
    );
  }

  return (
    <GestureDetector gesture={dragGesture}>
      <View className="flex-1" onLayout={handleLayout}>
        <Animated.FlatList
          className="flex-1"
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP, paddingBottom: bottomPadding }}
          data={units}
          initialNumToRender={INITIAL_TILES}
          keyExtractor={(unit) => unit.groupId}
          numColumns={COLUMNS}
          onContentSizeChange={(_, height) => {
            contentHeight.set(height);
          }}
          onEndReached={onEndReached}
          onEndReachedThreshold={NEXT_PAGE_THRESHOLD}
          onScroll={handleScroll}
          ref={listRef}
          renderItem={({ item }) => (
            <PhotoGridItem grouped={grouped} item={item} onPress={onPress} width={tileWidth} />
          )}
          scrollEnabled={!dragging}
          scrollEventThrottle={16}
          testID="photo-grid"
        />
      </View>
    </GestureDetector>
  );
}
