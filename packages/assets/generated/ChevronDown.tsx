import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const ChevronDown = (props: SvgProps) => (
  <Svg
    width={12}
    height={6.58}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 12 6.58"
    color={props.color ?? 'white'}
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m1 1 5 4.58L11 1"
    />
  </Svg>
);
export default ChevronDown;
