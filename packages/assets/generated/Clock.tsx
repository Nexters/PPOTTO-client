import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Clock = (props: SvgProps) => (
  <Svg
    width={14}
    height={14}
    fill="none"
    viewBox="0 0 14 14"
    color={props.color ?? '#929292'}
    {...props}
  >
    <Path
      fill="currentColor"
      d="M9.076 8.866a.583.583 0 0 0 .369-1.107l-.185.553zm-1.784-1.21h-.584c0 .251.161.474.4.554zm.583-2.744a.583.583 0 0 0-1.167 0h1.167m1.385 3.4.185-.553-1.969-.656-.184.553-.185.554 1.969.656zm-1.968-.656h.583V4.912H6.708v2.744zM12.542 7h-.584a4.667 4.667 0 0 1-4.666 4.667v1.166A5.833 5.833 0 0 0 13.125 7zm-5.25 5.25v-.583A4.667 4.667 0 0 1 2.625 7H1.458a5.833 5.833 0 0 0 5.834 5.833zM2.042 7h.583a4.667 4.667 0 0 1 4.667-4.667V1.167A5.833 5.833 0 0 0 1.458 7zm5.25-5.25v.583A4.667 4.667 0 0 1 11.958 7h1.167a5.833 5.833 0 0 0-5.833-5.833z"
    />
  </Svg>
);
export default Clock;
