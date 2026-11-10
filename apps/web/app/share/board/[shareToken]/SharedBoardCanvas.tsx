'use client';

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';

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
// 보드 화면(use-board-camera)의 포커스 이동과 같은 시간·곡선
const FOCUS_ANIMATION_MS = 350;

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export type SharedBoardCanvasHandle = {
  // 처음 열었을 때 위치로 부드럽게 돌아간다
  recenter: () => void;
};

type SharedBoardCanvasProps = {
  content: ShareBoardContent;
  initialCamera: CameraState;
  onStickerTap: (stickerId: string) => void;
  ref?: Ref<SharedBoardCanvasHandle>;
};

// 앱 보드처럼 끌어서 이동하고 핀치·휠로 확대·축소하는 보기 전용 보드
export function SharedBoardCanvas({
  content,
  initialCamera,
  onStickerTap,
  ref,
}: SharedBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState(initialCamera);
  const cameraRef = useRef(camera);
  const focusFrameRef = useRef<number | null>(null);
  const gesture = useViewOnlyBoardGesture({ containerRef, camera, setCamera, onStickerTap });

  useEffect(() => {
    cameraRef.current = camera;
  });

  const cancelFocus = () => {
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = null;
  };

  useEffect(() => cancelFocus, []);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      cancelFocus();
      const start = cameraRef.current;
      const startTime = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / FOCUS_ANIMATION_MS, 1);
        const eased = easeOutCubic(progress);
        setCamera({
          scale: start.scale + (initialCamera.scale - start.scale) * eased,
          x: start.x + (initialCamera.x - start.x) * eased,
          y: start.y + (initialCamera.y - start.y) * eased,
        });
        focusFrameRef.current = progress < 1 ? requestAnimationFrame(animate) : null;
      };
      focusFrameRef.current = requestAnimationFrame(animate);
    },
  }));

  const dotZoomRatio = Math.max(camera.scale, DOT_FADE_START_ZOOM) / DOT_FADE_START_ZOOM;
  const dotFadeProgress = (camera.scale - BOARD_ZOOM_MIN) / (DOT_FADE_START_ZOOM - BOARD_ZOOM_MIN);

  return (
    <div
      ref={containerRef}
      data-testid="shared-board-canvas"
      className="absolute inset-0 touch-none overflow-hidden select-none"
      {...gesture}
      // 돌아가는 중에 손을 대면 손가락을 따라가도록 이동을 멈춘다
      onPointerDown={(event) => {
        cancelFocus();
        gesture.onPointerDown(event);
      }}
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
