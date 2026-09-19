import { arrow, offset, shift, useFloating } from '@floating-ui/react';
import { useRef } from 'react';

const DEFAULT_GAP_PX = 8;
// anchor가 화면 이 정도 여유를 두고 완전히 들어와 있어야 clamp 없이 그대로 보여줄 수 있다.
// 호출부가 "카메라를 움직여서라도 anchor를 보여줄지" 판단할 때도 같은 기준을 쓴다.
export const VIEWPORT_PADDING_PX = 16;

type TipPosition = {
  x: number;
  y: number;
  arrowX: number | null;
};

type UseAnchoredTipPositionOptions = {
  gap?: number;
  arrowEdgePadding?: number;
};

export function useAnchoredTipPosition(
  anchorElement: Element | null,
  { gap = DEFAULT_GAP_PX, arrowEdgePadding = 0 }: UseAnchoredTipPositionOptions = {},
) {
  const arrowRef = useRef<HTMLDivElement>(null);

  const { refs, x, y, middlewareData, isPositioned } = useFloating({
    elements: { reference: anchorElement },
    strategy: 'fixed',
    placement: 'bottom',
    middleware: [
      offset(gap),
      shift({ padding: VIEWPORT_PADDING_PX }),
      // eslint-disable-next-line react-hooks/refs -- floating-ui의 문서화된 arrow 옵션 형태이며, ref.current는 렌더 중이 아니라 computePosition 실행 시점에 읽힘
      arrow({ element: arrowRef, padding: arrowEdgePadding }),
    ],
  });

  const position: TipPosition | null = isPositioned
    ? { x, y, arrowX: middlewareData.arrow?.x ?? null }
    : null;

  return { pillRef: refs.setFloating, arrowRef, position };
}
