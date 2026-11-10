'use client';

import { Logo } from '@ppotto/assets';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { SharedBoard } from '@/entities/board/api/board-api';
import type { CameraState } from '@/pages/board/model/board-camera';
import {
  computeShareCamera,
  computeShareContentBounds,
  toShareBoardContent,
} from '@/pages/board/model/board-share-layout';

import { SharedBoardCanvas } from './SharedBoardCanvas';
import { SharedBoardHeader } from './SharedBoardHeader';

// 처음 열 때는 로고와 제목이 있는 상단(Figma 3356:18674 Top 176px) 아래 영역에 보드를 맞춘다.
// 보드 자체는 화면 전체에 깔려 있어서 끌면 헤더 아래로도 지나간다
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
  const containerRef = useRef<HTMLElement>(null);
  const content = useMemo(() => toShareBoardContent(board), [board]);
  const canOpenRecap = board.scope !== 'BOARD';

  // 첫 크기를 잰 뒤 한 번만 정한다. 그 뒤로는 사용자가 움직인 카메라를 그대로 둔다
  const [initialCamera, setInitialCamera] = useState<CameraState | null>(null);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const area = {
        width: container.clientWidth,
        height: Math.max(0, container.clientHeight - HEADER_HEIGHT - BOTTOM_PADDING),
      };
      setInitialCamera((current) => {
        if (current) return current;
        const fit = computeShareCamera(computeShareContentBounds(content), area, WEB_SCALE_RANGE);
        return { ...fit, y: fit.y + HEADER_HEIGHT };
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [content]);

  const openRecap = (stickerId: string) => {
    if (canOpenRecap) router.push(`/share/board/${shareToken}/stickers/${stickerId}`);
  };

  return (
    <main
      ref={containerRef}
      className="relative mx-auto h-dvh w-full max-w-112.5 overflow-hidden bg-black"
      style={
        content.stickers.length === 0
          ? {
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }
          : undefined
      }
    >
      {content.stickers.length === 0 ? (
        <p className="text-body-03 absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-white">
          아직 스티커가 없어요
        </p>
      ) : (
        initialCamera && (
          <SharedBoardCanvas
            content={content}
            initialCamera={initialCamera}
            onStickerTap={openRecap}
          />
        )
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
