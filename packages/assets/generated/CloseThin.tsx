import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const CloseThin = (props: SvgProps) => (
  <Svg
    width={20}
    height={20}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 20 20"
    color={props.color ?? 'white'}
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={0.833}
      d="m5.833 5.833 8.334 8.334m-8.334 0 8.334-8.334"
    />
  </Svg>
);
export default CloseThin;
