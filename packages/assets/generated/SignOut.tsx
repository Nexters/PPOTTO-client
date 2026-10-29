import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const SignOut = (props: SvgProps) => (
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
      strokeWidth={2.625}
      d="M11.151 3.813H7.118a2.3 2.3 0 0 0-1.63.672 2.3 2.3 0 0 0-.676 1.624v15.782c0 .609.243 1.193.676 1.624a2.3 2.3 0 0 0 1.63.672h4.033m1.287-10.14H25.5m-4.991 5.25 4.991-5.25-4.991-5.25"
    />
  </Svg>
);
export default SignOut;
