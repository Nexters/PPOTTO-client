import { BigLogo } from '@ppotto/assets';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { AppBackground } from './AppBackground';

const ENTER_MS = 300;
const HOLD_MS = 700;
const EXIT_MS = 300;
const LOGO_WIDTH = 260.571;

export function AppLaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [screenOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: ENTER_MS,
        useNativeDriver: true,
      }),
      Animated.delay(HOLD_MS),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: EXIT_MS,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => animation.stop();
  }, [contentOpacity, screenOpacity]);

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
