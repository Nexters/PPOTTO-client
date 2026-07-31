import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const IconPlus = (props: SvgProps) => (
  <Svg
    width={19.133}
    height={19.133}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 19.133 19.133"
    color={props.color ?? 'black'}
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2.333}
      d="M9.567 1.167v16.8m8.4-8.4h-16.8"
    />
  </Svg>
);
export default IconPlus;
