import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Close = (props: SvgProps) => (
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
      d="m7 7 10 10M7 17 17 7"
    />
  </Svg>
);
export default Close;
