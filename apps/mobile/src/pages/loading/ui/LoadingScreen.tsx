import { CommonActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function LoadingScreen() {
  const navigation = useNavigation();

  const goToBoard = () =>
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'index', params: { path: '/board' } }],
      }),
    );

  return (
    <View className="flex-1">
      <SafeAreaView className="items-center justify-center flex-1 gap-4">
        <Text className="text-gray-900 text-header-01">로딩입니다.</Text>
        <Pressable className="px-4 py-3 bg-gray-900 rounded-16" onPress={goToBoard}>
          <Text className="text-body-04 text-gray-50">보드로</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
