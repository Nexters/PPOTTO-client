import Svg, { Rect, Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Kakaotalk = (props: SvgProps) => (
  <Svg width={24} height={24} fill="none" viewBox="0 0 24 24" {...props}>
    <Rect width={24} height={24} fill="#FEE500" rx={12} />
    <Path
      fill="black"
      fillRule="evenodd"
      d="M12 6c-3.866 0-7 2.409-7 5.38 0 1.847 1.212 3.476 3.058 4.445l-.777 2.823c-.068.249.218.448.438.303l3.405-2.235q.43.042.876.044c3.866 0 7-2.41 7-5.38C19 8.409 15.866 6 12 6"
      clipRule="evenodd"
    />
  </Svg>
);
export default Kakaotalk;
