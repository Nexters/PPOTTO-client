import Svg, { G, Path, Defs } from 'react-native-svg';
/* SVGR has dropped some elements not supported by react-native-svg: filter */
import type { SvgProps } from 'react-native-svg';
const ImageMultiple = (props: SvgProps) => (
  <Svg
    width={36}
    height={39}
    fill="none"
    viewBox="0 0 36 39"
    color={props.color ?? 'white'}
    {...props}
  >
    <G fill="currentColor" filter="url(#icon-ImageMultiple__a)">
      <Path d="M24.167 11.39a3.056 3.056 0 0 0-3.056-3.056h-7.222a3.056 3.056 0 0 0-3.056 3.055v7.222a3.056 3.056 0 0 0 3.056 3.056h7.222a3.056 3.056 0 0 0 3.055-3.056z" />
      <Path d="M27.5 14.167c0-.912-.444-1.524-1.262-1.979a.833.833 0 1 0-.81 1.457c.332.184.405.285.405.522V22.5a.84.84 0 0 1-.833.834h-8.332a.84.84 0 0 1-.67-.34l-.055-.083a.832.832 0 1 0-1.448.825A2.5 2.5 0 0 0 16.667 25H25c1.377 0 2.5-1.123 2.5-2.5z" />
    </G>
    <Defs></Defs>
  </Svg>
);
export default ImageMultiple;
