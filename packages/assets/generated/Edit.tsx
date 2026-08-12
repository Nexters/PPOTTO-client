import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Edit = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    color={props.color ?? 'white'}
    {...props}
  >
    <Path
      fill="currentColor"
      fillRule="evenodd"
      d="M15.184 4.8a1.2 1.2 0 0 1 1.697 0l2.07 2.067a1.2 1.2 0 0 1 0 1.698l-9.773 9.779a1.2 1.2 0 0 1-.612.328l-4.366.88.882-4.361a1.2 1.2 0 0 1 .327-.61z"
      clipRule="evenodd"
    />
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.8 19.552h6m-15.6 0 4.366-.88a1.2 1.2 0 0 0 .612-.328l9.774-9.78a1.2 1.2 0 0 0-.001-1.697L16.88 4.8a1.2 1.2 0 0 0-1.697.001l-9.775 9.78a1.2 1.2 0 0 0-.327.61z"
    />
  </Svg>
);
export default Edit;
