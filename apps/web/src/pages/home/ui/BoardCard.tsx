import { Clock, MenuKebab, Overlap, UserProfile } from '@ppotto/assets';
import Image from 'next/image';

import type { BoardSummary } from '@/entities/board/api/board-api';
import { cn } from '@/shared/lib/cn';
import { hexToRgba } from '@/shared/lib/hex-to-rgba';
import { AnalysisPill } from '@/shared/ui/AnalysisPill';

import { formatRelativeTime } from '../model/relative-time';

const MAX_PARTICIPANT_ICONS = 5;
const ANALYSIS_LABEL = { UPLOADING: '업로드 중', ANALYZING: '분석 중' } as const;

type BoardCardProps = {
  board: BoardSummary;
  now: number;
  isMenuTarget: boolean;
  onOpen: () => void;
  onOpenMenu?: () => void;
};

export function BoardCard({ board, now, isMenuTarget, onOpen, onOpenMenu }: BoardCardProps) {
  const hasPreview = board.previewImageUrls.length > 0;
  const metaColor = hasPreview ? '#929292' : '#757575';

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-24 bg-gray-900',
        hasPreview ? 'h-33' : 'h-19.5',
        isMenuTarget && 'z-30',
      )}
      style={
        hasPreview && board.mainColor
          ? {
              backgroundImage: `radial-gradient(218px 92px at 50% 100%, ${hexToRgba(board.mainColor, 0.4)}, ${hexToRgba(board.mainColor, 0)})`,
            }
          : undefined
      }
    >
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 flex flex-col items-center pt-4"
      >
        <span className="flex items-center gap-2">
          <span className="text-body-03 whitespace-nowrap text-white">{board.name}</span>
          {board.kind === 'SHARED' && <ParticipantIcons count={board.participantCount} />}
        </span>
        <span
          className={cn(
            'mt-1 flex items-center gap-1 text-caption-01',
            hasPreview ? 'text-gray-500' : 'text-gray-600',
          )}
        >
          <Clock width={14} height={14} color={metaColor} />
          {formatRelativeTime(board.lastActivityAt, now)}
          <span aria-hidden>·</span>
          <Overlap width={14} height={14} color={metaColor} />
          {board.stickerCount}개
        </span>
        {hasPreview && (
          <span className="absolute inset-x-0 top-17.5 flex justify-center">
            {board.previewImageUrls.map((url, index) => (
              <span key={index} className="relative size-20 not-first:-ml-4">
                <Image src={url} alt="" fill sizes="80px" className="object-contain" />
              </span>
            ))}
          </span>
        )}
      </button>
      {board.analysisStatus && (
        <div className="pointer-events-none absolute top-3 left-4">
          <AnalysisPill content={ANALYSIS_LABEL[board.analysisStatus]} />
        </div>
      )}
      {onOpenMenu && (
        <button
          type="button"
          aria-label={`${board.name} 보드 메뉴`}
          onClick={onOpenMenu}
          className="absolute top-4 right-4"
        >
          <MenuKebab />
        </button>
      )}
      {isMenuTarget && (
        <div className="pointer-events-none absolute inset-0 rounded-24 border-2 border-gray-300" />
      )}
    </div>
  );
}

function ParticipantIcons({ count }: { count: number }) {
  return (
    <span role="img" aria-label={`참여자 ${count}명`} className="flex items-center">
      {Array.from({ length: Math.min(count, MAX_PARTICIPANT_ICONS) }, (_, index) => (
        <span
          key={index}
          className={cn(
            'flex size-6 items-center justify-center rounded-full not-last:-mr-1.5',
            'border-[1.5px] border-gray-900 bg-gray-800',
          )}
        >
          <UserProfile width={15} height={15} />
        </span>
      ))}
    </span>
  );
}
