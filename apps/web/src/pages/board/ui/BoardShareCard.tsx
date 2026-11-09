import { Logo } from '@ppotto/assets';
import { useMemo } from 'react';

import { useBoardQuery } from '@/entities/board/api/board-queries';

import {
  computeShareCamera,
  computeShareContentBounds,
  SHARE_CONTENT_AREA,
  toShareBoardContent,
} from '../model/board-share-layout';

import { ShareBoardScene } from './ShareBoardScene';

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
        {content && <ShareBoardScene content={content} camera={camera} />}
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
