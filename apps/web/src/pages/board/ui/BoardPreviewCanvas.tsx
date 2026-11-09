import Image from 'next/image';
import { useMemo } from 'react';

import { useBoardQuery } from '@/entities/board/api/board-queries';

import { drawingZIndex } from '../model/board-drawing';
import { computeInvitationPreviewCamera } from '../model/board-invitation-preview-layout';
import { computeShareContentBounds, toShareBoardContent } from '../model/board-share-layout';

import { BOARD_TEXT_STYLE } from './board-text-style';
import { DrawingStroke } from './DrawingStroke';
import { Sticker } from './Sticker';
import { StickerBadgeMark } from './StickerBadgeMark';

const DOT_SPACING = 18;

type BoardPreviewCanvasProps = {
  boardId: string;
  width: number;
  height: number;
};

export function BoardPreviewCanvas({ boardId, width, height }: BoardPreviewCanvasProps) {
  const { data: board } = useBoardQuery(boardId);
  const content = useMemo(() => (board ? toShareBoardContent(board) : null), [board]);
  const bounds = useMemo(() => (content ? computeShareContentBounds(content) : null), [content]);
  const camera = useMemo(
    () => computeInvitationPreviewCamera(bounds, width, height),
    [bounds, width, height],
  );
  const isEmpty =
    !content ||
    (content.stickers.length === 0 && content.drawings.length === 0 && content.texts.length === 0);

  return (
    <div className="relative overflow-hidden bg-black" style={{ width, height }}>
      {isEmpty ? (
        <Image
          src="/invitations/default-preview.png"
          alt=""
          fill
          unoptimized
          sizes={`${width}px`}
          className="object-cover"
        />
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
              backgroundSize: `${DOT_SPACING}px ${DOT_SPACING}px`,
            }}
          />
          <div
            style={
              {
                position: 'absolute',
                inset: 0,
                transformOrigin: '0 0',
                transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
                '--inv-camera-scale': 1,
              } as React.CSSProperties
            }
          >
            {content.drawings.map((drawing) => (
              <svg
                key={drawing.id}
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'visible',
                  zIndex: drawingZIndex(drawing),
                }}
              >
                <DrawingStroke
                  points={drawing.points}
                  color={drawing.color}
                  strokeWidth={drawing.strokeWidth}
                />
              </svg>
            ))}
            {content.texts.map((item) => (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: item.x,
                  top: item.y,
                  zIndex: drawingZIndex(item),
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                    fontSize: item.fontSize,
                    color: '#fff',
                    maxWidth: item.maxWidth,
                    ...BOARD_TEXT_STYLE,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
            {content.stickers.map((sticker) => (
              <Sticker key={sticker.id} sticker={sticker} />
            ))}
            {content.stickers.map((sticker) => (
              <StickerBadgeMark key={sticker.id} sticker={sticker} isEditMode opacity={1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
