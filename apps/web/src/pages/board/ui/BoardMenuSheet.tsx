import { Edit, Invite, Participants, Share, SignOut, Trash } from '@ppotto/assets';
import type { ComponentType } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

type BoardRole = 'OWNER' | 'MEMBER';

type BoardMenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  role?: BoardRole;
};

type BoardMenuItemProps = {
  Icon: ComponentType<{ color?: string; width?: number; height?: number }>;
  label: string;
};

function BoardMenuItem({ Icon, label }: BoardMenuItemProps) {
  return (
    <button type="button" className="flex w-18 flex-col items-center gap-2">
      <span className="flex size-12 items-center justify-center rounded-full bg-gray-800">
        <Icon color="white" width={28} height={28} />
      </span>
      <span className="text-caption-01 w-full text-center font-medium text-white">{label}</span>
    </button>
  );
}

export function BoardMenuSheet({ isOpen, onClose, role }: BoardMenuSheetProps) {
  const isOwner = role === 'OWNER';
  const isMember = role === 'MEMBER';

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="보드 메뉴"
      overlayClassName="z-70 bg-gray-900/50"
      contentClassName="z-70 gap-5"
    >
      <span className="text-body-01 w-full text-white">보드 메뉴</span>
      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-5">
        <BoardMenuItem Icon={Invite} label="초대하기" />
        <BoardMenuItem Icon={Participants} label="참여자" />
        <BoardMenuItem Icon={Share} label="공유하기" />
        {isOwner && <BoardMenuItem Icon={Edit} label="이름 변경하기" />}
        {isMember && <BoardMenuItem Icon={SignOut} label="나가기" />}
        {isOwner && <BoardMenuItem Icon={Trash} label="삭제하기" />}
      </div>
    </BottomSheet>
  );
}
