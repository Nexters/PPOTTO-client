import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

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

  // 스플래시: 도트 배경은 루트 레이아웃의 AppBackground가 그린다.
  // 로고 중심을 화면 33.8% 높이(시안 250/740)에 두기 위해 67.6% 높이 박스에 중앙 정렬한다.
  return (
    <View accessibilityLabel="로그인 상태 확인 중" style={{ flex: 1 }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '67.6%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          resizeMode="contain"
          source={require('../../../assets/app-logo.png')}
          style={{ width: '80%', aspectRatio: 1 }}
        />
      </View>
    </View>
  );
}
