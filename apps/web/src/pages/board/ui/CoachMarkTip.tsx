'use client';

import { CloseThin, Tip, TooltipArrow } from '@ppotto/assets';
import { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/cn';
import { useAnchoredTipPosition } from '@/shared/lib/use-anchored-tip-position';

import type { CameraState } from '../model/board-camera';

const PILL_BORDER_RADIUS_PX = 8;
const GAP_PX = 28;

type CoachMarkTipProps = {
  anchorElement: Element | null;
  message: string;
  onDismiss: () => void;
  camera: CameraState;
};

export function CoachMarkTip({ anchorElement, message, onDismiss, camera }: CoachMarkTipProps) {
  const boardCanvas = anchorElement?.closest<HTMLElement>('[data-board-canvas]');
  const { pillRef, arrowRef, position, update } = useAnchoredTipPosition(anchorElement, {
    gap: GAP_PX,
    arrowEdgePadding: PILL_BORDER_RADIUS_PX,
    strategy: 'absolute',
    shiftToFit: false,
  });

  useLayoutEffect(() => {
    if (anchorElement) void update();
  }, [anchorElement, camera.x, camera.y, camera.scale, update]);

  if (!anchorElement || !boardCanvas) return null;

  return createPortal(
    <div
      ref={pillRef}
      role="tooltip"
      data-testid="coach-mark-pill"
      className="absolute z-9999"
      onPointerDownCapture={(event) => event.stopPropagation()}
      style={{
        left: position?.x ?? 0,
        top: position?.y ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <PillContent
        arrowRef={arrowRef}
        arrowX={position?.arrowX ?? 0}
        message={message}
        onDismiss={onDismiss}
      />
    </div>,
    boardCanvas,
  );
}

type PillContentProps = {
  arrowRef?: React.Ref<HTMLDivElement>;
  arrowX: number;
  message: string;
  onDismiss: () => void;
};

function PillContent({ arrowRef, arrowX, message, onDismiss }: PillContentProps) {
  return (
    <div className={cn('relative flex items-start gap-1', 'rounded-8 bg-gray-800 p-3')}>
      <div
        ref={arrowRef}
        data-testid="coach-mark-arrow"
        className="absolute bottom-[calc(100%-2px)]"
        style={{ transform: `translateX(${arrowX}px)` }}
      >
        <TooltipArrow />
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0">
          <Tip />
        </span>
        <p
          className={cn('text-body-06 line-clamp-2 w-50', 'text-gray-100 [word-break:break-word]')}
        >
          {message}
        </p>
      </div>
      <button type="button" onClick={onDismiss} aria-label="닫기" className="size-5 shrink-0">
        <CloseThin />
      </button>
    </div>
  );
}
