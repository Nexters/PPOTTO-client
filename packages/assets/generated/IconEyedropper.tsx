import Svg, { Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const IconEyedropper = (props: SvgProps) => (
  <Svg
    width={16.494}
    height={16.479}
    fill="none"
    preserveAspectRatio="none"
    viewBox="0 0 16.494 16.479"
    color={props.color ?? 'black'}
    {...props}
  >
    <Path
      fill="currentColor"
      d="M13.328 0c-.828 0-1.665.286-2.265.885L7.495 4.453l-.235-.235a.84.84 0 0 0-.599-.234.84.84 0 0 0-.599.234.857.857 0 0 0 0 1.199l.652.65-5.651 5.651a.85.85 0 0 0-.183.34l-.833 2.5c-.1.299-.041.635.182.859l.834.833c.223.223.56.282.859.182l2.5-.833a.84.84 0 0 0 .338-.182l5.652-5.651.65.65a.856.856 0 0 0 1.198 0 .857.857 0 0 0 0-1.198l-.234-.234 3.568-3.567c1.2-1.2 1.2-3.331 0-4.532-.6-.6-1.438-.885-2.266-.885M7.911 7.266l1.303 1.327-5.547 5.521-1.745.6-.13-.13c.191-.575.437-1.363.573-1.771z"
    />
  </Svg>
);
export default IconEyedropper;
