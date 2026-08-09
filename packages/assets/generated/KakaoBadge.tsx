import Svg, { Rect, Path } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const KakaoBadge = (props: SvgProps) => (
  <Svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
    <Rect width={16} height={16} fill="#FEE500" rx={8} />
    <Path
      fill="black"
      fillRule="evenodd"
      d="M8 4C5.487 4 3.45 5.606 3.45 7.587c0 1.231.788 2.317 1.988 2.963l-.505 1.882a.187.187 0 0 0 .285.202l2.212-1.49q.28.028.57.029c2.513 0 4.55-1.606 4.55-3.586C12.55 5.606 10.513 4 8 4"
      clipRule="evenodd"
    />
  </Svg>
);
export default KakaoBadge;
