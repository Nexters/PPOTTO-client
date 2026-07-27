import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function LoadingScreen() {
  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1 items-center justify-center gap-4">
        <Text className="text-header-01 text-gray-900">로딩입니다.</Text>
        <Pressable className="rounded-16 bg-gray-900 px-4 py-3" onPress={() => router.dismissAll()}>
          <Text className="text-body-04 text-gray-50">보드로</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
