import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Overlap = (props: SvgProps) => (
  <Svg
    width={14}
    height={14}
    fill="none"
    viewBox="0 0 14 14"
    color={props.color ?? '#929292'}
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.167}
      d="M4.2 5.133H2.8a1.4 1.4 0 0 0-1.4 1.4V11.2a1.4 1.4 0 0 0 1.4 1.4h4.667a1.4 1.4 0 0 0 1.4-1.4V9.45M11.2 1.4H6.533a1.4 1.4 0 0 0-1.4 1.4v4.667a1.4 1.4 0 0 0 1.4 1.4H11.2a1.4 1.4 0 0 0 1.4-1.4V2.8a1.4 1.4 0 0 0-1.4-1.4"
    />
  </Svg>
);
export default Overlap;
