'use client';

import { ChevronLeft } from '@ppotto/assets';
import Link from 'next/link';

type SharedRecapBackLinkProps = {
  shareToken: string;
};

export function SharedRecapBackLink({ shareToken }: SharedRecapBackLinkProps) {
  return (
    <Link
      href={`/share/board/${shareToken}`}
      aria-label="뒤로가기"
      className="absolute top-10 left-5"
    >
      <ChevronLeft color="white" />
    </Link>
  );
}
