import { Logo } from '@ppotto/assets';
import type { Ref } from 'react';

type BoardShareCardProps = {
  boardName?: string;
  snapshotRef: Ref<HTMLCanvasElement>;
};

// 카카오 템플릿 이미지(400×400, Figma 3356:18843)와 같은 카드로 이미지 저장·인스타그램 공유도 한다
// 카카오 템플릿에 보드를 어떤 기준으로 잘라 넣을지 아직 정해지지 않아, 우선 현재 뷰포트 가운데를 잘라 쓴다
export function BoardShareCard({ boardName, snapshotRef }: BoardShareCardProps) {
  return (
    <div className="relative size-100 overflow-hidden bg-black">
      <canvas ref={snapshotRef} className="absolute inset-0 size-full" />
      <span className="text-body-01 absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-white">
        {boardName}
      </span>
      <span className="absolute top-86 left-1/2 -translate-x-1/2">
        <Logo width={105} height={32} />
      </span>
    </div>
  );
}
