'use client';

import dynamic from 'next/dynamic';

import { DotBackground } from '@/shared/ui/DotBackground';
import { Modal } from '@/shared/ui/common/Modal';

import { useBoardPageState } from './model/use-board-page-state';
import { BoardHeader } from './ui/BoardHeader';
import { BoardToolbar } from './ui/BoardToolbar';

const BoardCanvas = dynamic(() => import('./ui/BoardCanvas').then((mod) => mod.BoardCanvas), {
  ssr: false,
});

export function BoardPage() {
  const {
    boardId,
    isBoardListLoading,
    isInitialUploadModalOpen,
    setIsInitialUploadModalOpen,
    confirmInitialUpload,
  } = useBoardPageState();

  return (
    <DotBackground>
      <div className="relative mx-auto h-dvh w-full max-w-107.5 overflow-hidden">
        <BoardHeader />
        <BoardContent boardId={boardId} isLoading={isBoardListLoading} />
        <BoardToolbar />
      </div>
      <Modal
        open={isInitialUploadModalOpen}
        onOpenChange={setIsInitialUploadModalOpen}
        title="묵은 사진 대방출!"
        description="아직 사진을 올린 적이 없어요. 사진을 올리러 가볼까요?"
      >
        <Modal.Cancel>취소</Modal.Cancel>
        <Modal.Confirm onClick={confirmInitialUpload}>확인</Modal.Confirm>
      </Modal>
    </DotBackground>
  );
}

function BoardContent({ boardId, isLoading }: { boardId?: string; isLoading: boolean }) {
  if (boardId) return <BoardCanvas boardId={boardId} />;

  return (
    <BoardStatus>{isLoading ? '보드를 불러오는 중이에요' : '보드를 불러오지 못했어요'}</BoardStatus>
  );
}

function BoardStatus({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <p className="text-gray-400 text-body-04">{children}</p>
    </div>
  );
}
