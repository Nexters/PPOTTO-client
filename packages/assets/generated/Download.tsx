import Svg, { G, Path, Defs, ClipPath } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Download = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    color={props.color ?? 'white'}
    {...props}
  >
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      clipPath="url(#icon-Download__a)"
    >
      <Path d="m17 12-5 5-5-5m5 5V4M6 20h12" />
    </G>
    <Defs>
      <ClipPath id="icon-Download__a">
        <Path fill="currentColor" d="M0 0h24v24H0z" />
      </ClipPath>
    </Defs>
  </Svg>
);
export default Download;
