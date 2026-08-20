import type { CSSProperties } from 'react';

// 편집창, 보드 측정 기준 통일
export const BOARD_TEXT_STYLE = {
  fontFamily: 'inherit',
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: 'normal',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  wordBreak: 'normal',
  textAlign: 'center',
} satisfies CSSProperties;
