import { FlatList, useWindowDimensions, View } from 'react-native';

import type { PhotoUnit } from '../model/photo-group';

import { PhotoTile } from './PhotoTile';

const COLUMNS = 4;
const GAP = 2;
const INITIAL_TILES = 24;

interface PhotoGridProps {
  bottomPadding: number;
  units: PhotoUnit[];
  onPress: (unit: PhotoUnit) => void;
}

/** 선택 가능한 사진 단위를 4열 그리드로 표시한다. */
export function PhotoGrid({ bottomPadding, units, onPress }: PhotoGridProps) {
  const { width } = useWindowDimensions();
  const tileWidth = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <FlatList
      className="flex-1"
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ gap: GAP, paddingBottom: bottomPadding }}
      data={units}
      initialNumToRender={INITIAL_TILES}
      keyExtractor={(unit) => unit.groupId}
      numColumns={COLUMNS}
      renderItem={({ item }) => (
        <View style={{ width: tileWidth }}>
          <PhotoTile
            onPress={() => onPress(item)}
            photoCount={item.photoCount}
            selected={!item.excluded}
            uri={item.photo.uri}
          />
        </View>
      )}
    />
  );
}
