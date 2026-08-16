import { CheckCircle, CheckCircleEmpty } from '@ppotto/assets';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

interface PhotoTileProps {
  uri: string;
  selected: boolean;
  onPress: () => void;
  grouped: boolean;
  /** 그룹이 담은 사진 수. 1보다 크면 묶음 배지를 보여준다. */
  photoCount?: number;
}

/** 사진 선택 상태와 연속 촬영 묶음 수를 표시한다. */
export function PhotoTile({ uri, selected, onPress, grouped, photoCount = 1 }: PhotoTileProps) {
  const [displayedUri, setDisplayedUri] = useState<string>();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      // w-full: 마지막 행에 1장만 남았을 때 행 전체를 차지하지 않도록 칸 너비는 부모가 정한다.
      className={cn(
        'w-full items-end justify-end overflow-hidden bg-gray-900 aspect-square',
        grouped ? 'p-2' : 'p-1.5',
      )}
      onPress={onPress}
    >
      <Image
        contentFit="cover"
        onDisplay={() => setDisplayedUri(uri)}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
      />
      {displayedUri !== uri && (
        <View className="bg-gray-800" pointerEvents="none" style={StyleSheet.absoluteFill} />
      )}
      {grouped && !selected && <View className="bg-black/70" style={StyleSheet.absoluteFill} />}

      {grouped && photoCount > 1 && (
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
