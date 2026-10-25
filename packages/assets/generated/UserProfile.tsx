import Svg, { G, Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const UserProfile = (props: SvgProps) => (
  <Svg
    width={15}
    height={15}
    fill="none"
    viewBox="0 0 15 15"
    color={props.color ?? '#E0E0E0'}
    {...props}
  >
    <G fill="currentColor">
      <Path d="M1.5 12.82c0-2.36 1.971-4.272 6-4.272s6 1.912 6 4.272c0 .376-.274.68-.612.68H2.112c-.338 0-.612-.304-.612-.68M9.75 3.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0" />
    </G>
  </Svg>
);
export default UserProfile;
