import type { BoardDetail } from '@/entities/board/api/board-api';

import type { StickerData } from '../ui/Sticker';

import type { CameraState } from './board-camera';
import {
  getDrawingBounds,
  getTextBounds,
  isStrokeDrawing,
  isTextDrawing,
  type ParsedDrawing,
  type ParsedText,
  parseStrokePoints,
  parseTextDrawing,
} from './board-drawing';
import { needsInitialLayout } from './board-layout';

export type ShareBoardContent = {
  stickers: StickerData[];
  drawings: ParsedDrawing[];
  texts: ParsedText[];
};

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

// 400×400 카드에서 제목(top 28~52)·로고(top 344~376)와 겹치지 않는 보드 영역 — Figma 3356:18843
export const SHARE_CONTENT_AREA = { left: 24, top: 64, width: 352, height: 272 };

// 시안의 스티커 크기(84.48px ÷ 기본 160px) — 스티커가 적어도 이보다 크게 키우지 않는다
const SHARE_SCALE_MAX = 0.528;
// 스티커가 넓게 퍼져 있어도 이보다 작게는 줄이지 않는다 — 넘치는 부분은 영역 밖으로 잘린다
const SHARE_SCALE_MIN = 0.2;

// Sticker.tsx의 STICKER_MAX_EDGE(160) 절반 — 실제 이미지 비율은 로드해야 알 수 있어 근사한다
const STICKER_HALF_EDGE = 80;
// 스티커 아래에 붙는 제목 뱃지가 잘리지 않도록 아래쪽에 더 두는 여유
const BADGE_ALLOWANCE = 24;

export function toShareBoardContent(board: BoardDetail): ShareBoardContent {
  return {
    stickers: board.stickers
      .filter((sticker) => !needsInitialLayout(sticker))
      .map((sticker) => ({
        ...sticker,
        posX: sticker.posX!,
        posY: sticker.posY!,
        zIndex: sticker.zIndex!,
      })),
    drawings: board.drawings.filter(isStrokeDrawing).map((drawing) => ({
      id: drawing.id,
      points: parseStrokePoints(drawing.stroke),
      color: drawing.color,
      strokeWidth: drawing.strokeWidth,
      zIndex: drawing.zIndex,
    })),
    texts: board.drawings.filter(isTextDrawing).map(parseTextDrawing),
  };
}

// 스티커·그림·텍스트를 모두 감싸는 보드 좌표 영역
export function computeShareContentBounds({
  stickers,
  drawings,
  texts,
}: ShareBoardContent): Bounds | null {
  const rects = [
    ...stickers.map((sticker) => {
      const half = STICKER_HALF_EDGE * sticker.scale;
      return {
        minX: sticker.posX - half,
        minY: sticker.posY - half,
        maxX: sticker.posX + half,
        maxY: sticker.posY + half + BADGE_ALLOWANCE,
      };
    }),
    ...[
      ...drawings.map((drawing) => getDrawingBounds(drawing.points, drawing.strokeWidth)),
      ...texts.map(getTextBounds),
    ]
      .filter((bounds) => bounds !== null)
      .map((bounds) => ({
        minX: bounds.x - bounds.width / 2,
        minY: bounds.y - bounds.height / 2,
        maxX: bounds.x + bounds.width / 2,
        maxY: bounds.y + bounds.height / 2,
      })),
  ];
  if (rects.length === 0) return null;

  return {
    minX: Math.min(...rects.map((rect) => rect.minX)),
    minY: Math.min(...rects.map((rect) => rect.minY)),
    maxX: Math.max(...rects.map((rect) => rect.maxX)),
    maxY: Math.max(...rects.map((rect) => rect.maxY)),
  };
}

// 보드 전체가 SHARE_CONTENT_AREA 가운데에 들어오도록 하는 카메라 — 좌표는 콘텐츠 영역 기준
export function computeShareCamera(bounds: Bounds | null): CameraState {
  const { width, height } = SHARE_CONTENT_AREA;
  if (!bounds) return { scale: SHARE_SCALE_MAX, x: width / 2, y: height / 2 };

  const fitScale = Math.min(
    width / (bounds.maxX - bounds.minX),
    height / (bounds.maxY - bounds.minY),
  );
  const scale = Math.min(Math.max(fitScale, SHARE_SCALE_MIN), SHARE_SCALE_MAX);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    scale,
    x: width / 2 - centerX * scale,
    y: height / 2 - centerY * scale,
  };
}
