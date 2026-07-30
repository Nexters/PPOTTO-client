import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const ChevronUp = (props: SvgProps) => (
  <Svg
    width={12}
    height={6.583}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 12 6.583"
    color={props.color ?? 'white'}
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M1 5.583 6 1l5 4.583"
    />
  </Svg>
);
export default ChevronUp;
