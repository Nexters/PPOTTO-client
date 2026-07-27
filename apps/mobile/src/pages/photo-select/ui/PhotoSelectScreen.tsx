import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function PhotoSelectScreen() {
  return (
    <View className="flex-1">
      <SafeAreaView className="items-center justify-center flex-1 gap-4">
        <Text className="text-gray-900 text-header-01">사진 선택입니다.</Text>
        <Pressable
          className="px-4 py-3 bg-gray-900 rounded-16"
          onPress={() => router.push('/loading')}
        >
          <Text className="text-body-04 text-gray-50">로딩으로</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
