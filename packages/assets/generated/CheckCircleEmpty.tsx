import Svg, { Mask, Path, G } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const CheckCircleEmpty = (props: SvgProps) => (
  <Svg
    width={14.667}
    height={14.667}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 14.667 14.667"
    color={props.color ?? 'white'}
    {...props}
  >
    <Mask
      id="icon-CheckCircleEmpty__a"
      width={15}
      height={15}
      x={0}
      y={0}
      maskUnits="userSpaceOnUse"
      style={{
        maskType: 'luminance',
      }}
    >
      <Path
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={1.333}
        d="M7.333 14a6.65 6.65 0 0 0 4.714-1.953A6.65 6.65 0 0 0 14 7.333a6.65 6.65 0 0 0-1.953-4.714A6.65 6.65 0 0 0 7.333.667 6.65 6.65 0 0 0 2.62 2.619 6.65 6.65 0 0 0 .667 7.333a6.65 6.65 0 0 0 1.952 4.714A6.65 6.65 0 0 0 7.333 14Z"
      />
    </Mask>
    <G mask="url(#icon-CheckCircleEmpty__a)">
      <Path fill="currentColor" d="M-.667-.667h16v16h-16z" />
    </G>
  </Svg>
);
export default CheckCircleEmpty;
