import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Filter = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    color={props.color ?? 'white'}
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 17H5M19 7h-9M17 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
    />
  </Svg>
);
export default Filter;
