'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { useBoardQuery } from '@/entities/board/api/board-queries';
import { bridge } from '@/shared/lib/bridge';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';

import { type CameraState, panCamera, pinchToZoomParams, zoomCamera } from '../model/board-camera';
import { toLayoutInput } from '../model/board-layout';

import type { ToolbarMode } from './BoardToolbar';
import { SelectBox } from './SelectBox';
import { Sticker, type StickerData } from './Sticker';

type BoardCanvasProps = {
  boardId: string;
  mode: ToolbarMode;
};

type TouchPoint = { x: number; y: number };

export function BoardCanvas({ boardId, mode }: BoardCanvasProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState<CameraState>({ scale: 1, x: 0, y: 0 });
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragScale, setDragScale] = useState<number | null>(null);
  const pinchTouchesRef = useRef<[TouchPoint, TouchPoint] | null>(null);
  const { data, isLoading, isError, refetch, isStale } = useBoardQuery(boardId);
  const { mutate: saveLayout } = useUpdateBoardLayoutMutation();
  const { push } = useFlow();
  const queryClient = useQueryClient();
  const isEditMode = mode === 'move';
  // 편집 모드를 벗어나면 선택도 같이 해제된 것으로 취급
  const selectedId = isEditMode ? selectedStickerId : null;

  useRefetchOnActive(refetch, isStale);

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
  // dragend는 자식(스티커) -> 부모로 버블링되므로, Stage 자신의 드래그가 끝난 경우만 처리해야 함
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (e.target !== e.target.getStage()) return;
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

  // 선택박스는 별도 노드라 드래그 중인 실시간 위치를 직접 전달해줘야 스티커를 따라 움직임
  const handleStickerDragMove = (e: KonvaEventObject<DragEvent>) => {
    setDragPosition({ x: e.target.x(), y: e.target.y() });
  };

  // 캐시에 변경분을 바로 반영하고 저장 요청을 보냄
  const saveStickerLayout = (
    sticker: StickerData,
    overrides: Partial<Pick<StickerData, 'posX' | 'posY' | 'scale'>>,
  ) => {
    const updated = { ...sticker, ...overrides };

    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current
        ? {
            ...current,
            stickers: current.stickers.map((s) =>
              s.id === sticker.id ? { ...s, ...overrides } : s,
            ),
          }
        : current,
    );

    saveLayout({
      boardId,
      input: toLayoutInput([
        {
          id: updated.id,
          posX: updated.posX,
          posY: updated.posY,
          rotation: updated.rotation,
          scale: updated.scale,
          zIndex: updated.zIndex,
          badgeOffsetX: updated.badgeOffsetX,
          badgeOffsetY: updated.badgeOffsetY,
        },
      ]),
    });
  };

  const handleStickerDragEnd = (sticker: StickerData, e: KonvaEventObject<DragEvent>) => {
    setDragPosition(null);
    saveStickerLayout(sticker, { posX: e.target.x(), posY: e.target.y() });
  };

  const handleResizeMove = (scale: number) => {
    setDragScale(scale);
  };

  const handleResizeEnd = (sticker: StickerData, scale: number) => {
    setDragScale(null);
    saveStickerLayout(sticker, { scale });
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오는 중이에요</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오지 못했어요</p>
      </div>
    );
  }

  const stickers: StickerData[] = [...data.stickers].sort((a, b) => a.zIndex - b.zIndex);
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
              draggable={selectedId === sticker.id}
              scaleOverride={selectedId === sticker.id ? (dragScale ?? undefined) : undefined}
              onDragMove={handleStickerDragMove}
              onDragEnd={(e) => handleStickerDragEnd(sticker, e)}
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
            <SelectBox
              sticker={selectedSticker}
              position={dragPosition ?? undefined}
              scale={dragScale ?? undefined}
              onResizeMove={handleResizeMove}
              onResizeEnd={(scale) => handleResizeEnd(selectedSticker, scale)}
            />
          </Layer>
        )}
      </Stage>
    </div>
  );
}
