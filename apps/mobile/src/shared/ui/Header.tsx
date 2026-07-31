import { ChevronLeft, Logo } from '@ppotto/assets';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

export function Header() {
  return (
    <View className="flex-row items-center justify-between">
      <Pressable
        accessibilityLabel="뒤로 가기"
        accessibilityRole="button"
        className="items-center justify-center size-6"
        onPress={() => router.back()}
      >
        <ChevronLeft />
      </Pressable>
      <Logo />
      <View className="size-6" />
    </View>
  );
}
