import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const IconHand = (props: SvgProps) => (
  <Svg
    width={16.995}
    height={19}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 16.995 19"
    color={props.color ?? 'white'}
    {...props}
  >
    <Path
      fill="currentColor"
      d="M5 11.5 2.866 9.671a1.74 1.74 0 0 0-2.482 2.417l3.36 4.134c1.036 1.277 1.555 1.915 2.251 2.293q.188.102.384.183C7.112 19 7.935 19 9.58 19h1.05c1.238 0 1.856 0 2.398-.156a4 4 0 0 0 2.192-1.58c.318-.463.513-1.046.902-2.21l.004-.015c.616-1.85.87-2.539.87-3.565 0-1.474-.813-2.483-1.935-3.156-.679-.406-1.643-.551-3.572-.84L8.5 7V1.75a1.75 1.75 0 0 0-3.5 0z"
    />
  </Svg>
);
export default IconHand;
