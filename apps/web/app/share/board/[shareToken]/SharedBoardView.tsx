'use client';

import { Logo } from '@ppotto/assets';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

import type { SharedBoard } from '@/entities/board/api/board-api';
import {
  computeShareCamera,
  computeShareContentBounds,
  toShareBoardContent,
} from '@/pages/board/model/board-share-layout';
import { ShareBoardScene } from '@/pages/board/ui/ShareBoardScene';

import { SharedBoardHeader } from './SharedBoardHeader';

// 로고와 제목이 있는 상단(Figma 3356:18674 Top 176px) 아래부터 보드를 그린다
const HEADER_HEIGHT = 176;
const BOTTOM_PADDING = 24;
// 시안처럼 스티커를 원래 크기(160px)까지만 키우고, 보드 홈의 최소 줌보다 작게는 줄이지 않는다
const WEB_SCALE_RANGE = { min: 0.25, max: 1 };

type SharedBoardViewProps = {
  shareToken: string;
  board: SharedBoard;
};

export function SharedBoardView({ shareToken, board }: SharedBoardViewProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const content = useMemo(() => toShareBoardContent(board), [board]);
  const canOpenRecap = board.scope !== 'BOARD';

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      setArea({ width: container.clientWidth, height: container.clientHeight });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const camera = useMemo(
    () => area && computeShareCamera(computeShareContentBounds(content), area, WEB_SCALE_RANGE),
    [area, content],
  );

  const openRecap = (event: MouseEvent<HTMLDivElement>) => {
    if (!canOpenRecap || !(event.target instanceof Element)) return;
    const stickerId = event.target.closest<HTMLElement>('[data-sticker-id]')?.dataset.stickerId;
    if (stickerId) router.push(`/share/board/${shareToken}/stickers/${stickerId}`);
  };

  return (
    <main
      className="relative mx-auto h-dvh w-full max-w-112.5 overflow-hidden bg-black"
      style={{
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      {content.stickers.length === 0 ? (
        <p className="text-body-03 absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-white">
          아직 스티커가 없어요
        </p>
      ) : (
        <div
          ref={containerRef}
          className="absolute inset-x-0 overflow-hidden"
          style={{ top: HEADER_HEIGHT, bottom: BOTTOM_PADDING }}
          onClick={openRecap}
        >
          {camera && <ShareBoardScene content={content} camera={camera} interactive />}
        </div>
      )}
      <SharedBoardHeader>
        <Logo width={104} height={32} />
        <div className="flex flex-col gap-1">
          <span className="text-body-01 text-white">
            {board.sharerName}님의 {board.boardName}
          </span>
          <span className="text-body-06 text-gray-500">스티커 {board.stickers.length}개</span>
        </div>
      </SharedBoardHeader>
    </main>
  );
}
