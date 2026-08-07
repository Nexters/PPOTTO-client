import Svg, { G, Path, Defs, ClipPath } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
const Trash = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    color={props.color ?? 'white'}
    {...props}
  >
    <G clipPath="url(#icon-Trash__a)">
      <Path
        fill="currentColor"
        d="M15 2a1 1 0 0 1 .895.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.723-3.447.072-.121A1 1 0 0 1 9 2zm-5 8a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1m4 0a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1M8.618 6h6.764l-1-2H9.618z"
      />
    </G>
    <Defs>
      <ClipPath id="icon-Trash__a">
        <Path fill="currentColor" d="M0 0h24v24H0z" />
      </ClipPath>
    </Defs>
  </Svg>
);
export default Trash;
