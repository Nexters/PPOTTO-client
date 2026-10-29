import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Invite = (props: SvgProps) => (
  <Svg
    width={28}
    height={28}
    fill="none"
    viewBox="0 0 28 28"
    color={props.color ?? 'white'}
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.333}
      d="M22.75 7.083v3.5m0 0v3.5m0-3.5h-3.5m3.5 0h3.5"
    />
    <Path
      fill="currentColor"
      d="M15.75 7.583a4.667 4.667 0 1 1-9.333 0 4.667 4.667 0 0 1 9.333 0m-5.833 7h2.333a8.167 8.167 0 0 1 8.167 8.167 2.333 2.333 0 0 1-2.334 2.333h-14A2.333 2.333 0 0 1 1.75 22.75a8.167 8.167 0 0 1 8.167-8.167"
    />
  </Svg>
);
export default Invite;
