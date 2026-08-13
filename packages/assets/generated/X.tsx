import Svg, { Rect, Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const X = (props: SvgProps) => (
  <Svg width={24} height={24} fill="none" viewBox="0 0 24 24" {...props}>
    <Rect width={24} height={24} fill="black" rx={12} />
    <Path
      fill="white"
      d="M15.69 6.11h1.968l-4.3 4.914 5.058 6.687h-3.96l-3.101-4.055-3.55 4.055H5.836l4.599-5.256-4.852-6.344h4.06l2.804 3.706zM15 16.534h1.09L9.05 7.227h-1.17z"
    />
  </Svg>
);
export default X;
