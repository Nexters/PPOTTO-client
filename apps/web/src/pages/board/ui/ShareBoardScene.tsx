import type { CameraState } from '../model/board-camera';
import { drawingZIndex } from '../model/board-drawing';
import type { ShareBoardContent } from '../model/board-share-layout';

import { BOARD_TEXT_STYLE } from './board-text-style';
import { DrawingStroke } from './DrawingStroke';
import { Sticker } from './Sticker';
import { StickerBadgeMark } from './StickerBadgeMark';

type ShareBoardSceneProps = {
  content: ShareBoardContent;
  camera: CameraState;
  // true면 스티커 이름표도 눌러 스티커를 고를 수 있다 (공유 웹 페이지)
  interactive?: boolean;
};

// 편집 기능 없이 보드를 그리는 읽기 전용 화면 — 공유 이미지 카드와 공유 웹 페이지가 함께 쓴다
export function ShareBoardScene({ content, camera, interactive = false }: ShareBoardSceneProps) {
  return (
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
        <StickerBadgeMark
          key={sticker.id}
          sticker={sticker}
          isEditMode={!interactive}
          opacity={1}
        />
      ))}
    </div>
  );
}
