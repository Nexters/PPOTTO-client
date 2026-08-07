import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// board 라우트 위에 얹히는 로딩 레이어. 밑에서 보드 웹뷰가 미리 로드
export function LoadingOverlay() {
  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="items-center justify-center flex-1">
        <Text className="text-gray-900 text-header-01">로딩입니다.</Text>
      </SafeAreaView>
    </View>
  );
}
