'use client';

import Link from 'next/link';

import { BoardPage } from '@/pages/board';
import { useBridge } from '@/shared/lib/bridge';

const tempButton = 'rounded-12 bg-gray-900 px-4 py-2 text-body-04 text-gray-50';

export default function Board() {
  const bridge = useBridge();
  return (
    <>
      <BoardPage />
      <div className="fixed inset-x-0 bottom-8 flex justify-center gap-2">
        <Link href="/recap" className={tempButton}>
          리캡 보기
        </Link>
        <button className={tempButton} onClick={() => bridge.send('OPEN_PHOTO_SELECT')}>
          이미지 추가
        </button>
      </div>
    </>
  );
}
