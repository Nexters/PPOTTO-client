import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const ChevronLeftSmall = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    color={props.color ?? 'white'}
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m14.5 7-5 5 5 5"
    />
  </Svg>
);
export default ChevronLeftSmall;
