import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getAccessToken } from '@/lib/auth-session';
import { AppWebView } from '@/shared/ui/AppWebView';

// 로그인/온보딩/약관 전용 웹뷰
export function AuthScreen() {
  const [status, setStatus] = useState<'checking' | 'login' | 'retry'>('checking');

  const retry = async () => {
    setStatus('checking');
    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
        router.replace('/board');
      } else {
        setStatus('login');
      }
    } catch {
      setStatus('retry');
    }
  };

  useEffect(() => {
    let active = true;
    void getAccessToken().then(
      (accessToken) => {
        if (!active) return;
        if (accessToken) router.replace('/board');
        else setStatus('login');
      },
      () => {
        if (active) setStatus('retry');
      },
    );
    return () => {
      active = false;
    };
  }, []);

  if (status === 'login') return <AppWebView />;

  if (status === 'retry') {
    return (
      <View className="items-center justify-center flex-1 gap-4 px-8">
        <Text className="text-center text-white text-body-03">연결을 확인해 주세요.</Text>
        <Pressable
          accessibilityRole="button"
          className="px-6 py-3 bg-white rounded-full"
          onPress={() => void retry()}
        >
          <Text className="text-gray-900 text-body-03">다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="items-center justify-center flex-1">
      <ActivityIndicator accessibilityLabel="로그인 상태 확인 중" color="white" />
    </View>
  );
}
