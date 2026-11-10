'use client';

import { ChevronLeft } from '@ppotto/assets';
import Link from 'next/link';

import { SHARED_BOARD_PADDING_TOP } from '../../shared-board-safe-area';

type SharedRecapBackLinkProps = {
  shareToken: string;
};

export function SharedRecapBackLink({ shareToken }: SharedRecapBackLinkProps) {
  return (
    <Link
      href={`/share/board/${shareToken}`}
      aria-label="뒤로가기"
      className="absolute left-5"
      // 리캡 제목과 같은 줄에 오도록 제목 위 여백과 맞춘다
      style={{ top: SHARED_BOARD_PADDING_TOP }}
    >
      <ChevronLeft color="white" />
    </Link>
  );
}
