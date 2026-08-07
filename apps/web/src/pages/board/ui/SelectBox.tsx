'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useRef } from 'react';
import { Group, Rect } from 'react-konva';
import { Html } from 'react-konva-utils';

import { computeResizeScale } from '../model/board-transform';
import type { Point } from '../model/geometry';

import { getPhotoSize, useStickerImage, type StickerData } from './Sticker';

const SELECT_BOX_COLOR = '#009fff';
const SELECT_BOX_HANDLE_SIZE = 4;
const SELECT_BOX_HANDLE_HIT_SIZE = 24;
const SELECT_BOX_Z_INDEX = 9999;
const ORIGIN: Point = { x: 0, y: 0 };

type SelectBoxProps = {
  sticker: StickerData;
  position?: { x: number; y: number };
  scale?: number;
  onResizeMove?: (scale: number) => void;
  onResizeEnd?: (scale: number) => void;
};

export function SelectBox({ sticker, position, scale, onResizeMove, onResizeEnd }: SelectBoxProps) {
  const photoImage = useStickerImage(sticker.imageUrl ?? undefined);
  const resizeStartRef = useRef<Point | null>(null);

  const { width: visualWidth, height: visualHeight } = getPhotoSize(
    photoImage,
    scale ?? sticker.scale,
  );

  const { width: hitWidth, height: hitHeight } = getPhotoSize(photoImage, sticker.scale);

  if (visualWidth <= 0 || visualHeight <= 0 || hitWidth <= 0 || hitHeight <= 0) return null;

  const handleCornerDrag = (e: KonvaEventObject<DragEvent>, onMove?: (scale: number) => void) => {
    const start = resizeStartRef.current;
    if (!start) return;
    const current: Point = {
      x: e.target.x() + SELECT_BOX_HANDLE_HIT_SIZE / 2,
      y: e.target.y() + SELECT_BOX_HANDLE_HIT_SIZE / 2,
    };
    onMove?.(computeResizeScale(ORIGIN, start, current, sticker.scale));
  };

  const hitCorners: Point[] = [
    { x: -hitWidth / 2, y: -hitHeight / 2 },
    { x: hitWidth / 2, y: -hitHeight / 2 },
    { x: -hitWidth / 2, y: hitHeight / 2 },
    { x: hitWidth / 2, y: hitHeight / 2 },
  ];

  const visualCorners: Point[] = [
    { x: -visualWidth / 2, y: -visualHeight / 2 },
    { x: visualWidth / 2, y: -visualHeight / 2 },
    { x: -visualWidth / 2, y: visualHeight / 2 },
    { x: visualWidth / 2, y: visualHeight / 2 },
  ];

  return (
    <Group
      x={position?.x ?? sticker.posX}
      y={position?.y ?? sticker.posY}
      rotation={sticker.rotation}
    >
      {hitCorners.map((corner) => (
        <Rect
          key={`hit-${corner.x}-${corner.y}`}
          x={corner.x - SELECT_BOX_HANDLE_HIT_SIZE / 2}
          y={corner.y - SELECT_BOX_HANDLE_HIT_SIZE / 2}
          width={SELECT_BOX_HANDLE_HIT_SIZE}
          height={SELECT_BOX_HANDLE_HIT_SIZE}
          fill="transparent"
          draggable
          onDragStart={() => {
            resizeStartRef.current = corner;
          }}
          onDragMove={(e) => handleCornerDrag(e, onResizeMove)}
          onDragEnd={(e) => {
            handleCornerDrag(e, onResizeEnd);
            resizeStartRef.current = null;
          }}
        />
      ))}
      <Html divProps={{ style: { zIndex: SELECT_BOX_Z_INDEX, pointerEvents: 'none' } }}>
        <div
          style={{
            position: 'absolute',
            left: -visualWidth / 2,
            top: -visualHeight / 2,
            width: visualWidth,
            height: visualHeight,
            boxSizing: 'border-box',
            border: `0.5px solid ${SELECT_BOX_COLOR}`,
          }}
        >
          {visualCorners.map((corner) => (
            <div
              key={`${corner.x}-${corner.y}`}
              style={{
                position: 'absolute',
                left: corner.x + visualWidth / 2 - SELECT_BOX_HANDLE_SIZE / 2,
                top: corner.y + visualHeight / 2 - SELECT_BOX_HANDLE_SIZE / 2,
                width: SELECT_BOX_HANDLE_SIZE,
                height: SELECT_BOX_HANDLE_SIZE,
                boxSizing: 'border-box',
                background: 'white',
                border: `0.5px solid ${SELECT_BOX_COLOR}`,
              }}
            />
          ))}
        </div>
      </Html>
    </Group>
  );
}
