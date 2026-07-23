import * as MediaLibrary from 'expo-media-library';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function HomeScreen() {
  const [permission, requestPermission] = MediaLibrary.usePermissions();

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1 items-center justify-center gap-4">
        <Text className="text-subtitle-01 text-gray-900">갤러리 접근 권한</Text>
        <Text className="text-body-06 text-gray-600">
          status: {permission?.status ?? 'checking...'}
        </Text>
        <Pressable className="rounded-16 bg-gray-900 px-4 py-3" onPress={() => requestPermission()}>
          <Text className="text-body-04 text-gray-50">권한 요청하기</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
