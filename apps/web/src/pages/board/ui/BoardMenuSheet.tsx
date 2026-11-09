import { Edit, Invite, Participants, Share, SignOut, Trash } from '@ppotto/assets';
import type { ComponentType } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import type { BoardShareScope } from '../model/board-share-scope';

import { BoardInvitationContent } from './BoardInvitationContent';
import {
  BoardParticipantsContent,
  type BoardParticipantListState,
} from './BoardParticipantsContent';
import { BoardShareContent, type BoardShareActions } from './BoardShareContent';
import { BoardShareScopeContent } from './BoardShareScopeContent';

type BoardRole = 'OWNER' | 'MEMBER';

export type BoardMenuView =
  | { type: 'menu' }
  | { type: 'participants' }
  | { type: 'invitation'; code: string }
  | { type: 'share' }
  | { type: 'shareScope' };

const boardMenuTitles: Record<BoardMenuView['type'], string> = {
  menu: '보드 메뉴',
  participants: '참여자',
  invitation: '초대하기',
  share: '공유하기',
  shareScope: '공유 설정',
};

type BoardMenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  role?: BoardRole;
  view: BoardMenuView;
  onViewChange?: (view: BoardMenuView) => void;
  onInvite: () => void;
  onCopyInvitation: (code: string) => void;
  onKakaoShareInvitation?: (code: string) => void;
  isInvitePending?: boolean;
  participantList?: BoardParticipantListState;
  // 공동 보드 외부 공유 정책이 정해지기 전까지 공동 보드에서는 공유하기를 막는다
  isShareDisabled?: boolean;
  share?: BoardShareActions;
  shareScope?: BoardShareScope;
  onShareScopeChange?: (scope: BoardShareScope) => void;
};

type BoardMenuItemProps = {
  Icon: ComponentType<{ color?: string; width?: number; height?: number }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

function BoardMenuItem({ Icon, label, onClick, disabled }: BoardMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-18 flex-col items-center gap-2 disabled:opacity-50"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
        <Icon color="white" width={28} height={28} />
      </span>
      <span className="text-caption-01 w-full text-center font-medium text-white">{label}</span>
    </button>
  );
}

function assertNever(value: never): never {
  throw new Error(`처리하지 않은 보드 메뉴 화면: ${JSON.stringify(value)}`);
}

function BoardMenuContent({
  view,
  role,
  onViewChange,
  onInvite,
  onCopyInvitation,
  onKakaoShareInvitation,
  isInvitePending,
  participantList,
  isShareDisabled,
  share,
  shareScope,
  onShareScopeChange,
}: Omit<BoardMenuSheetProps, 'isOpen' | 'onClose'>) {
  switch (view.type) {
    case 'participants':
      return participantList ? (
        <BoardParticipantsContent
          {...participantList}
          onInvite={onInvite}
          isInvitePending={isInvitePending}
        />
      ) : null;
    case 'invitation':
      return (
        <BoardInvitationContent
          code={view.code}
          onCopy={() => onCopyInvitation(view.code)}
          onKakaoShare={
            onKakaoShareInvitation ? () => onKakaoShareInvitation(view.code) : undefined
          }
        />
      );
    case 'share':
      return share ? (
        <BoardShareContent {...share} onOpenScope={() => onViewChange?.({ type: 'shareScope' })} />
      ) : null;
    case 'shareScope':
      return shareScope ? (
        <BoardShareScopeContent
          scope={shareScope}
          onBack={() => onViewChange?.({ type: 'share' })}
          onSelect={(next) => onShareScopeChange?.(next)}
        />
      ) : null;
    case 'menu':
      return (
        <>
          <span className="text-body-01 w-full text-white">보드 메뉴</span>
          <div className="grid w-full grid-cols-4 gap-x-2 gap-y-5">
            <BoardMenuItem
              Icon={Invite}
              label="초대하기"
              onClick={onInvite}
              disabled={isInvitePending}
            />
            <BoardMenuItem
              Icon={Participants}
              label="참여자"
              onClick={() => onViewChange?.({ type: 'participants' })}
            />
            <BoardMenuItem
              Icon={Share}
              label="공유하기"
              onClick={() => onViewChange?.({ type: 'share' })}
              disabled={isShareDisabled || !share}
            />
            {role === 'OWNER' && <BoardMenuItem Icon={Edit} label="이름 변경하기" />}
            {role === 'MEMBER' && <BoardMenuItem Icon={SignOut} label="나가기" />}
            {role === 'OWNER' && <BoardMenuItem Icon={Trash} label="삭제하기" />}
          </div>
        </>
      );
    default:
      return assertNever(view);
  }
}

export function BoardMenuSheet({ isOpen, onClose, view, ...contentProps }: BoardMenuSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={boardMenuTitles[view.type]}
      overlayClassName="z-70 bg-gray-900/50"
      contentClassName="z-70 gap-5"
    >
      <BoardMenuContent view={view} {...contentProps} />
    </BottomSheet>
  );
}
