import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

export function AppBackground() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="app-dots" width={18} height={18} patternUnits="userSpaceOnUse">
            <Circle cx={9} cy={9} r={1} fill="white" opacity={0.16} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#app-dots)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
});
