import Svg, { G, Circle, Path, Defs, ClipPath, Rect } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const ParticipantProfile = (props: SvgProps) => (
  <Svg width={48} height={48} fill="none" viewBox="0 0 48 48" {...props}>
    <G clipPath="url(#icon-ParticipantProfile__a)">
      <Circle cx={23.998} cy={27.629} r={18.315} fill="white" />
      <Path
        fill="#313131"
        fillRule="evenodd"
        d="M24 0c12.954 0 24 11.047 24 24 0 12.954-11.046 24-24 24C11.047 48 0 36.955 0 24 0 11.047 11.047 0 24 0m2.182 28.364H21.82c-5.816 0-10.567 4.55-10.91 10.273a19.636 19.636 0 0 0 26.183 0c-.345-5.722-5.094-10.273-10.91-10.273M24 10.91c-3.313 0-6.545 3.232-6.545 6.546S20.687 24 24 24c3.314 0 6.546-3.231 6.546-6.545S27.314 10.909 24 10.909"
        clipRule="evenodd"
      />
    </G>
    <Defs>
      <ClipPath id="icon-ParticipantProfile__a">
        <Rect width={48} height={48} fill="white" rx={24} />
      </ClipPath>
    </Defs>
  </Svg>
);
export default ParticipantProfile;
