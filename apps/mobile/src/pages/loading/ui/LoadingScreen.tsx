import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function LoadingScreen() {
  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text className="text-header-01 text-gray-900">로딩입니다.</Text>
      </SafeAreaView>
    </View>
  );
}
