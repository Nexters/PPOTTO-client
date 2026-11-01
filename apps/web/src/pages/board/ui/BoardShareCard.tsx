import { Logo } from '@ppotto/assets';
import { useMemo } from 'react';

import { useBoardQuery } from '@/entities/board/api/board-queries';

import { drawingZIndex } from '../model/board-drawing';
import {
  computeShareCamera,
  computeShareContentBounds,
  SHARE_CONTENT_AREA,
  toShareBoardContent,
} from '../model/board-share-layout';

import { BOARD_TEXT_STYLE } from './board-text-style';
import { DrawingStroke } from './DrawingStroke';
import { Sticker } from './Sticker';
import { StickerBadgeMark } from './StickerBadgeMark';

const DOT_SPACING = 18;

type BoardShareCardProps = {
  boardId: string;
  boardName?: string;
};

// 카카오 템플릿 이미지(400×400, Figma 3356:18843)와 같은 카드로 이미지 저장·인스타그램 공유도 한다
// 사용자가 보던 화면과 무관하게 보드 전체를 제목·로고 사이 영역에 맞춰 그린다
export function BoardShareCard({ boardId, boardName }: BoardShareCardProps) {
  const { data: board } = useBoardQuery(boardId);
  const content = useMemo(() => (board ? toShareBoardContent(board) : null), [board]);
  const camera = useMemo(
    () => computeShareCamera(content ? computeShareContentBounds(content) : null),
    [content],
  );

  return (
    <div className="relative size-100 overflow-hidden bg-black">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: `${DOT_SPACING}px ${DOT_SPACING}px`,
        }}
      />
      <div className="absolute overflow-hidden" style={SHARE_CONTENT_AREA}>
        {content && (
          <div
            style={
              {
                position: 'absolute',
                inset: 0,
                transformOrigin: '0 0',
                transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
                // 뱃지도 스티커와 같은 비율로 줄어야 시안처럼 보인다
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
        )}
      </div>
      <span className="text-body-01 absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-white">
        {boardName}
      </span>
      <span className="absolute top-86 left-1/2 -translate-x-1/2">
        <Logo width={105} height={32} />
      </span>
    </div>
  );
}
