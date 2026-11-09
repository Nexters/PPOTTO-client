import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const AlertCircle = (props: SvgProps) => (
  <Svg
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 16 16"
    color={props.color ?? '#FF3F4B'}
    {...props}
  >
    <Path
      fill="currentColor"
      d="M8 1.46A6.54 6.54 0 0 0 1.46 8 6.54 6.54 0 0 0 8 14.54 6.54 6.54 0 0 0 14.54 8 6.54 6.54 0 0 0 8 1.46m-.006 9.66a.595.595 0 0 1-.593-.593c0-.327.267-.594.593-.594a.595.595 0 0 1 0 1.187m.607-2.66c0 .34-.267.613-.6.613a.605.605 0 0 1-.6-.613V5.493c0-.34.267-.613.6-.613s.6.273.6.613z"
    />
  </Svg>
);
export default AlertCircle;
