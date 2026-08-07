import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Reload = (props: SvgProps) => (
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
      d="M19.933 13.041a8 8 0 1 1-9.925-8.788c3.9-1 7.935 1.007 9.425 4.747"
    />
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 4v5h-5"
    />
  </Svg>
);
export default Reload;
