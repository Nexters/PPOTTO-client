import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const KakaoLogo = (props: SvgProps) => (
  <Svg
    width={21}
    height={20}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 21 20"
    color={props.color ?? 'black'}
    {...props}
  >
    <Path
      fill="currentColor"
      fillRule="evenodd"
      d="M10.5 0C4.7 0 0 3.706 0 8.277c0 2.842 1.818 5.348 4.587 6.838l-1.165 4.343a.43.43 0 0 0 .657.467l5.107-3.439c.43.042.869.067 1.314.067 5.799 0 10.5-3.706 10.5-8.276S16.299 0 10.5 0"
      clipRule="evenodd"
    />
  </Svg>
);
export default KakaoLogo;
