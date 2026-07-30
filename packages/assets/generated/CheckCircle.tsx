import Svg, { Mask, G, Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const CheckCircle = (props: SvgProps) => (
  <Svg
    width={14.667}
    height={14.667}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 14.667 14.667"
    {...props}
  >
    <Mask
      id="icon-CheckCircle__a"
      width={15}
      height={15}
      x={0}
      y={0}
      maskUnits="userSpaceOnUse"
      style={{
        maskType: 'luminance',
      }}
    >
      <G strokeLinejoin="round" strokeWidth={1.333}>
        <Path
          fill="white"
          stroke="white"
          d="M7.333 14a6.65 6.65 0 0 0 4.714-1.953A6.65 6.65 0 0 0 14 7.333a6.65 6.65 0 0 0-1.953-4.714A6.65 6.65 0 0 0 7.333.667 6.65 6.65 0 0 0 2.62 2.619 6.65 6.65 0 0 0 .667 7.333a6.65 6.65 0 0 0 1.952 4.714A6.65 6.65 0 0 0 7.333 14Z"
        />
        <Path stroke="black" strokeLinecap="round" d="m4.667 7.333 2 2 4-4" />
      </G>
    </Mask>
    <G mask="url(#icon-CheckCircle__a)">
      <Path fill="white" d="M-.667-.667h16v16h-16z" />
    </G>
  </Svg>
);
export default CheckCircle;
