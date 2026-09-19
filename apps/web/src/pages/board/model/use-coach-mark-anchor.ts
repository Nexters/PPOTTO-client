import { type RefObject, useState } from 'react';

import { hasSeenCoachMark, markCoachMarkSeen } from '@/shared/lib/coach-mark-storage';
import { VIEWPORT_PADDING_PX } from '@/shared/lib/use-anchored-tip-position';

import { type CameraState, computeFocusTarget, isRectFullyVisible } from './board-camera';
import type { Point } from './geometry';

type UseCoachMarkAnchorParams = {
  coachMarkId: string;
  userId: string | undefined;
  container: HTMLDivElement | null;
  cameraRef: RefObject<CameraState>;
  requestFocus: (target: CameraState, onComplete?: () => void) => void;
};

export function useCoachMarkAnchor({
  coachMarkId,
  userId,
  container,
  cameraRef,
  requestFocus,
}: UseCoachMarkAnchorParams) {
  const [anchorElement, setAnchorElement] = useState<Element | null>(null);
  const [anchorKey, setAnchorKey] = useState(0);

  const show = (findElement: () => Element | null, focusPoints: Point[]) => {
    if (!userId || hasSeenCoachMark(coachMarkId, userId) || !container) return;

    const showCoachMark = () => {
      const element = findElement();
      if (!element) return;
      setAnchorElement(element);
      setAnchorKey((key) => key + 1);
      markCoachMarkSeen(coachMarkId, userId);
    };

    const containerRect = container.getBoundingClientRect();
    const elementRect = findElement()?.getBoundingClientRect();

    if (elementRect && isRectFullyVisible(elementRect, containerRect, VIEWPORT_PADDING_PX)) {
      showCoachMark();
      return;
    }

    const viewport = { width: containerRect.width, height: containerRect.height };
    requestFocus(computeFocusTarget(cameraRef.current, focusPoints, viewport), showCoachMark);
  };

  return {
    anchorElement,
    anchorKey,
    onDismiss: () => setAnchorElement(null),
    show,
  };
}
