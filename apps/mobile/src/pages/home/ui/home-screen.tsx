import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GalleryPermissionRequest } from './gallery-permission-request';

export function HomeScreen() {
  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1 items-center gap-4 pt-8">
        <Text className="text-header-01 text-gray-900">gallery-100</Text>
        <GalleryPermissionRequest />
      </SafeAreaView>
    </View>
  );
}
