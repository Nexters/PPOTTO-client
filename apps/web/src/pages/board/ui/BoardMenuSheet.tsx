import { Edit, Invite, Participants, Share, SignOut, Trash } from '@ppotto/assets';
import type { ComponentType } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import { BoardInvitationContent } from './BoardInvitationContent';

type BoardRole = 'OWNER' | 'MEMBER';

export type BoardMenuView = { type: 'menu' } | { type: 'invitation'; code: string };

const boardMenuTitles: Record<BoardMenuView['type'], string> = {
  menu: '보드 메뉴',
  invitation: '초대하기',
};

type BoardMenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  role?: BoardRole;
  view: BoardMenuView;
  onInvite: () => void;
  isInvitePending?: boolean;
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
  onInvite,
  isInvitePending,
}: Pick<BoardMenuSheetProps, 'view' | 'role' | 'onInvite' | 'isInvitePending'>) {
  switch (view.type) {
    case 'invitation':
      return <BoardInvitationContent code={view.code} />;
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
            <BoardMenuItem Icon={Participants} label="참여자" />
            <BoardMenuItem Icon={Share} label="공유하기" />
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

export function BoardMenuSheet({
  isOpen,
  onClose,
  role,
  view,
  onInvite,
  isInvitePending,
}: BoardMenuSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={boardMenuTitles[view.type]}
      overlayClassName="z-70 bg-gray-900/50"
      contentClassName="z-70 gap-5"
    >
      <BoardMenuContent
        view={view}
        role={role}
        onInvite={onInvite}
        isInvitePending={isInvitePending}
      />
    </BottomSheet>
  );
}
