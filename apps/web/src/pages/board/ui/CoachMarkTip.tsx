'use client';

import { CloseThin, Tip, TooltipArrow } from '@ppotto/assets';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/cn';
import { useAnchoredTipPosition } from '@/shared/lib/use-anchored-tip-position';

import { type CameraState, toWorldPoint } from '../model/board-camera';

const PILL_BORDER_RADIUS_PX = 8;
const GAP_PX = 28;
const WORLD_LAYER_Z_INDEX = 9999;

type WorldPosition = { x: number; y: number; arrowX: number };

type CoachMarkTipProps = {
  anchorElement: Element | null;
  message: string;
  onDismiss: () => void;
  camera: CameraState;
};

export function CoachMarkTip({ anchorElement, message, onDismiss, camera }: CoachMarkTipProps) {
  const { pillRef, arrowRef, position } = useAnchoredTipPosition(anchorElement, {
    gap: GAP_PX,
    arrowEdgePadding: PILL_BORDER_RADIUS_PX,
  });

  const [worldPosition, setWorldPosition] = useState<WorldPosition | null>(null);
  if (position && !worldPosition) {
    const containerRect = anchorElement?.closest('[data-board-canvas]')?.getBoundingClientRect();
    const world = toWorldPoint(camera, {
      x: position.x - (containerRect?.left ?? 0),
      y: position.y - (containerRect?.top ?? 0),
    });
    setWorldPosition({ x: world.x, y: world.y, arrowX: position.arrowX ?? 0 });
  }

  if (!anchorElement) return null;

  return (
    <>
      {createPortal(
        <div
          ref={pillRef}
          aria-hidden
          data-testid="coach-mark-pill"
          className="fixed opacity-0"
          style={{ left: position?.x ?? 0, top: position?.y ?? 0, pointerEvents: 'none' }}
        >
          <PillContent
            arrowRef={arrowRef}
            arrowX={position?.arrowX ?? 0}
            message={message}
            onDismiss={() => {}}
          />
        </div>,
        document.body,
      )}
      {worldPosition && (
        <div
          role="tooltip"
          data-testid="coach-mark-pill"
          className="absolute"
          style={{
            left: worldPosition.x,
            top: worldPosition.y,
            zIndex: WORLD_LAYER_Z_INDEX,
            transformOrigin: '0 0',
            transform: 'scale(var(--inv-camera-scale, 1))',
          }}
        >
          <PillContent arrowX={worldPosition.arrowX} message={message} onDismiss={onDismiss} />
        </div>
      )}
    </>
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
