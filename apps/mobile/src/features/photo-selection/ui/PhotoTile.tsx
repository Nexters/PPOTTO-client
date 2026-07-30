import { CheckCircle, CheckCircleEmpty } from '@ppotto/assets';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface PhotoTileProps {
  uri: string;
  selected: boolean;
  onPress: () => void;
  /** 그룹이 담은 사진 수. 1보다 크면 묶음 배지를 보여준다. */
  photoCount?: number;
}

/** 사진 선택 상태와 연속 촬영 묶음 수를 표시한다. */
export function PhotoTile({ uri, selected, onPress, photoCount = 1 }: PhotoTileProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      // w-full: 마지막 행에 1장만 남았을 때 행 전체를 차지하지 않도록 칸 너비는 부모가 정한다.
      className="w-full items-end justify-end overflow-hidden p-2 aspect-square"
      onPress={onPress}
    >
      <Image contentFit="cover" source={{ uri }} style={StyleSheet.absoluteFill} />
      {!selected && <View className="bg-black/70" style={StyleSheet.absoluteFill} />}

      {photoCount > 1 && (
        <View className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-px">
          <Text className="text-caption-02 text-white">{photoCount}</Text>
        </View>
      )}

      {/* Figma는 16 박스 안에 14.67 글리프를 중앙 정렬한다. 16으로 늘리면 선이 굵어진다. */}
      <View className="size-4 items-center justify-center">
        {selected ? (
          <CheckCircle height={14.667} width={14.667} />
        ) : (
          <CheckCircleEmpty color="white" height={14.667} width={14.667} />
        )}
      </View>
    </Pressable>
  );
}
