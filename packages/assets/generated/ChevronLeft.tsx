import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const ChevronLeft = (props: SvgProps) => (
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
      d="M16.5 19.5 9 12l7.5-7.5"
    />
  </Svg>
);
export default ChevronLeft;
