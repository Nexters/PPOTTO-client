'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useFlow } from '@stackflow/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';

import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { useBoardQuery } from '@/entities/board/api/board-queries';
import { bridge } from '@/shared/lib/bridge';

import {
  type CameraState,
  computeFocusTarget,
  panCamera,
  pinchToZoomParams,
  zoomCamera,
} from '../model/board-camera';
import { computeInitialLayout, needsInitialLayout, toLayoutInput } from '../model/board-layout';

import type { ToolbarMode } from './BoardToolbar';
import { SelectBox } from './SelectBox';
import { Sticker, type StickerData } from './Sticker';

type BoardCanvasProps = {
  boardId: string;
  mode: ToolbarMode;
};

type TouchPoint = { x: number; y: number };

const CAMERA_FOCUS_ANIMATION_MS = 350;

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export function BoardCanvas({ boardId, mode }: BoardCanvasProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState<CameraState>({ scale: 1, x: 0, y: 0 });
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const pinchTouchesRef = useRef<[TouchPoint, TouchPoint] | null>(null);
  const cameraFocusFrameRef = useRef<number | null>(null);
  const { data, isLoading, isError } = useBoardQuery(boardId);
  const { mutate: saveLayout } = useUpdateBoardLayoutMutation();
  const { push } = useFlow();
  const isEditMode = mode === 'move';
  // 편집 모드를 벗어나면 선택도 같이 해제된 것으로 취급
  const selectedId = isEditMode ? selectedStickerId : null;

  // 컨테이너 크기 관찰
  useEffect(() => {
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  // 보드에 있는 동안만 웹뷰 네이티브 바운스 스크롤을 꺼서 캔버스 드래그와 안 겹치게 함
  useEffect(() => {
    bridge.send('SET_BOARD_ACTIVE', { active: true });
    return () => bridge.send('SET_BOARD_ACTIVE', { active: false });
  }, []);

  // 데스크톱 휠/트랙패드 처리
  // 일반 휠/두 손가락 스크롤은 팬(이동), Ctrl+휠/트랙패드 핀치는 포인터 고정 줌
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    if (e.evt.ctrlKey) {
      const pointer = e.target.getStage()?.getPointerPosition();
      if (pointer) setCamera((current) => zoomCamera(current, pointer, e.evt.deltaY));
      return;
    }

    setCamera((current) => panCamera(current, { x: e.evt.deltaX, y: e.evt.deltaY }));
  };

  // 드래그가 끝난 뒤 결과 위치를 camera 상태에 맞춰둠 -> 다음 줌 계산이 최신 위치를 기준으로 이뤄지게 함
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    setCamera((current) => ({ ...current, x: e.target.x(), y: e.target.y() }));
  };

  // 모바일 핀치 처리
  const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    const { touches } = e.evt;
    if (touches.length !== 2) {
      pinchTouchesRef.current = null;
      return;
    }
    e.evt.preventDefault();

    const stage = e.target.getStage();
    stage?.stopDrag();

    const rect = stage?.container().getBoundingClientRect();
    const current: [TouchPoint, TouchPoint] = [
      { x: touches[0]!.clientX - (rect?.left ?? 0), y: touches[0]!.clientY - (rect?.top ?? 0) },
      { x: touches[1]!.clientX - (rect?.left ?? 0), y: touches[1]!.clientY - (rect?.top ?? 0) },
    ];

    if (pinchTouchesRef.current) {
      const { pointer, deltaY } = pinchToZoomParams(pinchTouchesRef.current, current);
      setCamera((prev) => zoomCamera(prev, pointer, deltaY));
    }
    pinchTouchesRef.current = current;
  };

  // 터치가 끝나면 핀치 상태를 초기화
  const handleTouchEnd = () => {
    pinchTouchesRef.current = null;
  };

  // 편집 모드에서 스티커가 아닌 빈 공간을 탭하면 선택 해제
  const handleStageClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) setSelectedStickerId(null);
  };

  // 스티커를 이미 배치된 것과 새로 생긴 것으로 나눔
  const placedStickers = data?.stickers.filter((sticker) => !needsInitialLayout([sticker])) ?? [];
  const unplacedStickers = data?.stickers.filter((sticker) => needsInitialLayout([sticker])) ?? [];

  // ResizeObserver가 아직 실제 크기를 못 잰 첫 렌더 순간에는 배치를 미룸
  const hasViewport = viewport.width > 0 && viewport.height > 0;
  const newLayout = useMemo(() => {
    if (!data || !hasViewport || unplacedStickers.length === 0) return [];
    return computeInitialLayout(unplacedStickers, placedStickers, viewport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hasViewport]);
  const layout = data ? [...placedStickers, ...newLayout] : null;

  // 새 스티커가 배치되면 저장 요청을 보내고, 그 무리의 중심으로 카메라를 부드럽게 이동시킴
  useEffect(() => {
    if (newLayout.length === 0) return;
    saveLayout({ boardId, input: toLayoutInput(newLayout) });

    const startCamera = camera;
    const targetCamera = computeFocusTarget(
      startCamera,
      newLayout.map((sticker) => ({ x: sticker.posX, y: sticker.posY })),
      viewport,
    );
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / CAMERA_FOCUS_ANIMATION_MS, 1);
      const eased = easeOutCubic(progress);
      setCamera({
        scale: startCamera.scale + (targetCamera.scale - startCamera.scale) * eased,
        x: startCamera.x + (targetCamera.x - startCamera.x) * eased,
        y: startCamera.y + (targetCamera.y - startCamera.y) * eased,
      });
      if (progress < 1) {
        cameraFocusFrameRef.current = requestAnimationFrame(animate);
      }
    };
    cameraFocusFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (cameraFocusFrameRef.current !== null) cancelAnimationFrame(cameraFocusFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, data, hasViewport]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오는 중이에요</p>
      </div>
    );
  }

  if (isError || !data || !layout) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오지 못했어요</p>
      </div>
    );
  }

  const stickers: StickerData[] = [...layout].sort((a, b) => a.zIndex - b.zIndex);
  const selectedSticker = stickers.find((sticker) => sticker.id === selectedId);

  return (
    <div ref={setContainer} className="h-full w-full touch-none">
      <Stage
        draggable
        width={viewport.width}
        height={viewport.height}
        x={camera.x}
        y={camera.y}
        scaleX={camera.scale}
        scaleY={camera.scale}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          {stickers.map((sticker) => (
            <Sticker
              key={sticker.id}
              sticker={sticker}
              onClick={() => {
                if (isEditMode) {
                  setSelectedStickerId(sticker.id);
                  return;
                }
                push('Recap', { stickerId: sticker.id });
              }}
            />
          ))}
        </Layer>
        {selectedSticker && (
          <Layer>
            <SelectBox sticker={selectedSticker} />
          </Layer>
        )}
      </Stage>
    </div>
  );
}
