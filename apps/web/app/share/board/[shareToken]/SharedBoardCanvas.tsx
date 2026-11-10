'use client';

import { useRef, useState } from 'react';

import {
  BOARD_ZOOM_MIN,
  DOT_FADE_START_ZOOM,
  type CameraState,
} from '@/pages/board/model/board-camera';
import type { ShareBoardContent } from '@/pages/board/model/board-share-layout';
import { useViewOnlyBoardGesture } from '@/pages/board/model/use-view-only-board-gesture';
import { ShareBoardScene } from '@/pages/board/ui/ShareBoardScene';

// 보드 화면(BoardCanvas)과 같은 점 배경 — 최소 줌에서 18px 간격이고, 줌에 따라 함께 커지며 흐려진다
const DOT_SPACING_AT_MIN_ZOOM = 18;

type SharedBoardCanvasProps = {
  content: ShareBoardContent;
  initialCamera: CameraState;
  onStickerTap: (stickerId: string) => void;
};

// 앱 보드처럼 끌어서 이동하고 핀치·휠로 확대·축소하는 보기 전용 보드
export function SharedBoardCanvas({
  content,
  initialCamera,
  onStickerTap,
}: SharedBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState(initialCamera);
  const gesture = useViewOnlyBoardGesture({
    containerRef,
    camera,
    setCamera,
    onTap: (target) => {
      if (!(target instanceof Element)) return;
      const stickerId = target.closest<HTMLElement>('[data-sticker-id]')?.dataset.stickerId;
      if (stickerId) onStickerTap(stickerId);
    },
  });

  const dotZoomRatio = Math.max(camera.scale, DOT_FADE_START_ZOOM) / DOT_FADE_START_ZOOM;
  const dotFadeProgress = (camera.scale - BOARD_ZOOM_MIN) / (DOT_FADE_START_ZOOM - BOARD_ZOOM_MIN);

  return (
    <div
      ref={containerRef}
      data-testid="shared-board-canvas"
      className="absolute inset-0 touch-none overflow-hidden select-none"
      {...gesture}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: `${DOT_SPACING_AT_MIN_ZOOM}px ${DOT_SPACING_AT_MIN_ZOOM}px`,
          backgroundPosition: `${camera.x / dotZoomRatio}px ${camera.y / dotZoomRatio}px`,
          transform: `scale(${dotZoomRatio})`,
          transformOrigin: '0 0',
          opacity: Math.min(1, Math.max(0, dotFadeProgress)),
        }}
      />
      <ShareBoardScene content={content} camera={camera} interactive />
    </div>
  );
}
