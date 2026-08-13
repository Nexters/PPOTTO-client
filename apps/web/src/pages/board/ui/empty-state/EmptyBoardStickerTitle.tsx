import Svg, { Rect, Text } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';

type EmptyBoardStickerTitleProps = SvgProps & {
  title: string;
};

export function EmptyBoardStickerTitle({ title, ...props }: EmptyBoardStickerTitleProps) {
  return (
    <Svg width={191} height={51} viewBox="0 0 191 51" {...props}>
      <Rect
        width={188}
        height={30}
        x={3.229}
        fill="white"
        rx={15}
        transform="rotate(6.18 3.229 0)"
      />
      <Text
        x={97.229}
        y={19.5}
        fill="#181818"
        fontFamily="Pretendard"
        fontSize={12}
        fontWeight={500}
        letterSpacing={-0.36}
        textAnchor="middle"
        transform="rotate(6.18 3.229 0)"
      >
        {title}
      </Text>
      <Rect
        width={10}
        height={10}
        x={179.224}
        y={18.049}
        fill="#FF3F4B"
        stroke="white"
        strokeWidth={2}
        rx={5}
        transform="rotate(6.18 179.224 18.049)"
      />
    </Svg>
  );
}
