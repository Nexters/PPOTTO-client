import { Clock, Overlap } from '@ppotto/assets';

import { useBoardQuery, useBoardSummaryListQuery } from '@/entities/board/api/board-queries';
import { cn } from '@/shared/lib/cn';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';

import {
  KAKAO_SHARE_CARD_SIZE,
  KAKAO_SHARE_PREVIEW_HEIGHT,
  KAKAO_SHARE_PREVIEW_LEFT,
  KAKAO_SHARE_PREVIEW_TOP,
  KAKAO_SHARE_PREVIEW_WIDTH,
} from '../model/board-invitation-preview-layout';

import { BoardPreviewCanvas } from './BoardPreviewCanvas';

const META_ICON_COLOR = '#757575';

type BoardKakaoShareCardProps = {
  boardId: string;
  now: number;
};

export function BoardKakaoShareCard({ boardId, now }: BoardKakaoShareCardProps) {
  const { data: board } = useBoardQuery(boardId);
  const { data: boardList } = useBoardSummaryListQuery();
  const boardSummary = boardList?.boards.find((item) => item.id === boardId);
  const boardName = board?.name ?? boardSummary?.name ?? '';
  const stickerCount = board?.stickers.length ?? boardSummary?.stickerCount ?? 0;

  return (
    <div
      className="relative overflow-hidden bg-gray-900"
      style={{ width: KAKAO_SHARE_CARD_SIZE, height: KAKAO_SHARE_CARD_SIZE }}
    >
      <div
        className={cn(
          'absolute top-[22.5px] left-[150.5px] flex w-24.75 flex-col items-center',
          'gap-1',
        )}
      >
        <p className="text-body-01 w-full text-center text-white">{boardName}</p>
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-1">
            <Clock width={14} height={14} color={META_ICON_COLOR} />
            <span className="text-caption-01 text-gray-600">
              {boardSummary ? formatRelativeTime(boardSummary.lastActivityAt, now) : ''}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Overlap width={14} height={14} color={META_ICON_COLOR} />
            <span className="text-caption-01 text-gray-600">{stickerCount}개</span>
          </span>
        </div>
      </div>
      <div
        className="absolute overflow-hidden rounded-[18.05px] border-[1.13px] border-gray-900"
        style={{
          top: KAKAO_SHARE_PREVIEW_TOP,
          left: KAKAO_SHARE_PREVIEW_LEFT,
          width: KAKAO_SHARE_PREVIEW_WIDTH,
          height: KAKAO_SHARE_PREVIEW_HEIGHT,
        }}
      >
        <BoardPreviewCanvas
          boardId={boardId}
          width={KAKAO_SHARE_PREVIEW_WIDTH}
          height={KAKAO_SHARE_PREVIEW_HEIGHT}
        />
      </div>
    </div>
  );
}
