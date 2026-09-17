'use client';

import { CloseThin, Tip, TooltipArrow } from '@ppotto/assets';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/cn';
import { useAnchoredTipPosition } from '@/shared/lib/use-anchored-tip-position';

const PILL_BORDER_RADIUS_PX = 8;
const GAP_PX = 28;

type CoachMarkTipProps = {
  anchorElement: Element | null;
  message: string;
  onDismiss: () => void;
};

export function CoachMarkTip({ anchorElement, message, onDismiss }: CoachMarkTipProps) {
  const { pillRef, arrowRef, position } = useAnchoredTipPosition(anchorElement, {
    gap: GAP_PX,
    arrowEdgePadding: PILL_BORDER_RADIUS_PX,
  });

  if (!anchorElement) return null;

  return createPortal(
    <div
      ref={pillRef}
      role="tooltip"
      className={cn(
        'fixed z-60 flex items-start gap-1',
        'rounded-8 bg-gray-800 p-3',
        !position && 'invisible',
      )}
      style={{ left: position?.x ?? 0, top: position?.y ?? 0 }}
    >
      <div
        ref={arrowRef}
        className="absolute bottom-[calc(100%-2px)]"
        style={{ transform: `translateX(${position?.arrowX ?? 0}px)` }}
      >
        <TooltipArrow />
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0">
          <Tip />
        </span>
        <p className="text-body-06 line-clamp-2 max-w-50 text-gray-100 [word-break:break-word]">
          {message}
        </p>
      </div>
      <button type="button" onClick={onDismiss} aria-label="닫기" className="size-5 shrink-0">
        <CloseThin />
      </button>
    </div>,
    document.body,
  );
}
