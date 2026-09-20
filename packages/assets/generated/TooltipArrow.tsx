import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const TooltipArrow = (props: SvgProps) => (
  <Svg
    width={13.908}
    height={11.164}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 13.908 11.164"
    color={props.color ?? '#313131'}
    {...props}
  >
    <Path
      fill="currentColor"
      d="M6.115.455a1 1 0 0 1 1.678 0l5.952 9.164a1 1 0 0 1-.839 1.545H1.002A1 1 0 0 1 .163 9.62z"
    />
  </Svg>
);
export default TooltipArrow;
