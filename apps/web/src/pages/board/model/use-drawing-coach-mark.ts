import { type RefObject, useState } from 'react';

import { hasSeenCoachMark, markCoachMarkSeen } from '@/shared/lib/coach-mark-storage';
import { VIEWPORT_PADDING_PX } from '@/shared/lib/use-anchored-tip-position';

import { type CameraState, computeFocusTarget, isRectFullyVisible } from './board-camera';
import type { ParsedDrawing } from './board-drawing';

const DRAWING_DELETE_COACH_MARK_ID = 'drawing-delete';

type UseDrawingCoachMarkParams = {
  container: HTMLDivElement | null;
  cameraRef: RefObject<CameraState>;
  requestFocus: (target: CameraState, onComplete?: () => void) => void;
  userId: string | undefined;
};

// 드로잉 모드를 나갈 때, 이번 세션에 그린 것 중 가장 최근 그림 기준으로 삭제 안내 코치마크를
// 최초 1회만 보여준다. 화면에 완전히 들어와 있지 않으면 카메라를 옮겨서라도 보여준다
export function useDrawingCoachMark({
  container,
  cameraRef,
  requestFocus,
  userId,
}: UseDrawingCoachMarkParams) {
  const [anchorElement, setAnchorElement] = useState<Element | null>(null);
  const [anchorKey, setAnchorKey] = useState(0);

  const onDrawModeExited = (drafts: ParsedDrawing[]) => {
    if (!userId || hasSeenCoachMark(DRAWING_DELETE_COACH_MARK_ID, userId) || !container) return;
    const latest = drafts[drafts.length - 1];
    if (!latest) return;

    // draft가 확정되면서 draft SVG는 사라지고 확정된 그림 목록의 SVG로 바뀐다(id는 유지됨).
    // 그 리렌더가 DOM에 반영된 뒤에 조회해야, 곧 사라질 draft 엘리먼트를 anchor로 잡아
    // 허공에 붕 뜬(detached) 상태가 되는 걸 피할 수 있다
    requestAnimationFrame(() => {
      const findShapeElement = () =>
        container.querySelector(
          `[data-drawing-id="${CSS.escape(latest.id)}"] path, [data-drawing-id="${CSS.escape(latest.id)}"] circle`,
        );

      const showCoachMark = () => {
        const shapeElement = findShapeElement();
        if (!shapeElement) return;
        setAnchorElement(shapeElement);
        setAnchorKey((key) => key + 1);
        markCoachMarkSeen(DRAWING_DELETE_COACH_MARK_ID, userId);
      };

      const containerRect = container.getBoundingClientRect();
      const shapeRect = findShapeElement()?.getBoundingClientRect();

      if (shapeRect && isRectFullyVisible(shapeRect, containerRect, VIEWPORT_PADDING_PX)) {
        showCoachMark();
        return;
      }

      const viewport = { width: containerRect.width, height: containerRect.height };
      requestFocus(computeFocusTarget(cameraRef.current, latest.points, viewport), showCoachMark);
    });
  };

  return {
    anchorElement,
    anchorKey,
    onDismiss: () => setAnchorElement(null),
    onDrawModeExited,
  };
}
