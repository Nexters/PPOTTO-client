import Svg, { Circle } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const MenuKebab = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    color={props.color ?? '#BDBDBD'}
    {...props}
  >
    <Circle cx={12} cy={5} r={1.5} fill="currentColor" />
    <Circle cx={12} cy={12} r={1.5} fill="currentColor" />
    <Circle cx={12} cy={19} r={1.5} fill="currentColor" />
  </Svg>
);
export default MenuKebab;
