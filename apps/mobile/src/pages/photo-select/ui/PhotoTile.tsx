import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

const CHECKED = require('@/assets/icons/check-circle.svg');
const UNCHECKED = require('@/assets/icons/check-circle-empty.svg');

interface PhotoTileProps {
  uri: string;
  selected: boolean;
  onPress: () => void;
}

export function PhotoTile({ uri, selected, onPress }: PhotoTileProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        flex: 1,
        aspectRatio: 1,
        padding: 8,
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        overflow: 'hidden',
      }}
    >
      <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
      {!selected && <View className="bg-black/70" style={StyleSheet.absoluteFill} />}
      <Image source={selected ? CHECKED : UNCHECKED} style={{ width: 16, height: 16 }} />
    </Pressable>
  );
}
