import { CommonActions, useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppWebView } from '@/shared/ui/AppWebView';

import { LoadingOverlay } from './ui/LoadingOverlay';

// 보드, 리캡 전용 웹뷰
export function BoardScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [progress] = useState(() => new Animated.Value(0));
  const [revealed, setRevealed] = useState(false);

  // 웹뷰 이동 시 실행 동작
  const reveal = () => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 300,
      easing: Easing.bezier(0.33, 0.01, 0, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setRevealed(true);
      // 이전 웹뷰 (AuthScreen) 스택에서 제거 / 언마운트
      navigation.dispatch((state) =>
        CommonActions.reset({ ...state, index: 0, routes: state.routes.slice(-1) }),
      );
    });
  };

  const boardX = progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });
  const loadingX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.3] });

  return (
    <View style={{ flex: 1 }}>
      {!revealed && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: loadingX }] }]}>
          <LoadingOverlay />
        </Animated.View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: boardX }] }]}>
        <AppWebView path="/board" onReady={reveal} />
      </Animated.View>
    </View>
  );
}
