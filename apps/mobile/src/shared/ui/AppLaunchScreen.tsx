import { BigLogo } from '@ppotto/assets';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { useIsAppReady } from '@/shared/lib/app-ready';

import { AppBackground } from './AppBackground';

const ENTER_MS = 300;
// 준비가 아무리 빨라도 이만큼은 보여준다 — 로고가 깜빡이고 사라지지 않게
const MIN_HOLD_MS = 700;
// 준비 신호가 안 와도 이만큼 지나면 비켜준다 — 로고만 보고 있는 것보다 낫다
const MAX_HOLD_MS = 3000;
const EXIT_MS = 300;
const LOGO_WIDTH = 260.571;

export function AppLaunchScreen() {
  const isReady = useIsAppReady();
  const [visible, setVisible] = useState(true);
  const [isMinHoldPassed, setIsMinHoldPassed] = useState(false);
  const [isMaxHoldPassed, setIsMaxHoldPassed] = useState(false);
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [screenOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const enter = Animated.timing(contentOpacity, {
      toValue: 1,
      duration: ENTER_MS,
      useNativeDriver: true,
    });
    enter.start();

    const minHold = setTimeout(() => setIsMinHoldPassed(true), ENTER_MS + MIN_HOLD_MS);
    const maxHold = setTimeout(() => setIsMaxHoldPassed(true), ENTER_MS + MAX_HOLD_MS);

    return () => {
      enter.stop();
      clearTimeout(minHold);
      clearTimeout(maxHold);
    };
  }, [contentOpacity]);

  useEffect(() => {
    if (!isMinHoldPassed) return;
    if (!isReady && !isMaxHoldPassed) return;

    const exit = Animated.timing(screenOpacity, {
      toValue: 0,
      duration: EXIT_MS,
      useNativeDriver: true,
    });
    exit.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => exit.stop();
  }, [isMinHoldPassed, isMaxHoldPassed, isReady, screenOpacity]);

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityLabel="앱 시작 화면"
      accessibilityViewIsModal
      style={[styles.container, { opacity: screenOpacity }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: contentOpacity }]}>
        <AppBackground />
        <BigLogo accessibilityLabel="PPOTTO" height={80} width={LOGO_WIDTH} style={styles.logo} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: '#000',
  },
  logo: {
    position: 'absolute',
    top: 210,
    left: '50%',
    transform: [{ translateX: -LOGO_WIDTH / 2 }],
  },
});
