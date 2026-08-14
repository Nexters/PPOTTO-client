'use client';

import * as Dialog from '@radix-ui/react-dialog';

import { cn } from '@/shared/lib/cn';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayClassName?: string;
  // 시트 바깥 요소로 포커스를 보내야 할 때 false로 트랩 해제
  modal?: boolean;
};

export function BottomSheet({
  isOpen,
  onClose,
  children,
  overlayClassName = 'backdrop-blur-[30px]',
  modal = true,
}: BottomSheetProps) {
  return (
    <Dialog.Root modal={modal} open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* non-modal이면 Dialog.Overlay가 렌더링을 안 해서 직접 그림 */}
      {modal ? (
        <Dialog.Overlay className={cn('modal-overlay fixed inset-0 z-50', overlayClassName)} />
      ) : (
        isOpen && (
          <div aria-hidden className={cn('modal-overlay fixed inset-0 z-50', overlayClassName)} />
        )
      )}
      <Dialog.Content
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
        // non-modal일 때 포커스 아웃으로 자동 닫히는 것 방지
        onFocusOutside={(e) => !modal && e.preventDefault()}
        className={cn(
          'sheet-content fixed inset-x-0 bottom-0 z-50',
          'flex flex-col gap-5 rounded-t-3xl bg-gray-900 pt-4',
          'pr-6 pb-10 pl-6',
        )}
      >
        <Dialog.Title className="sr-only">스티커 퀵메뉴</Dialog.Title>
        <div className="mx-auto h-1 w-14 shrink-0 rounded-full bg-gray-700" />
        {children}
      </Dialog.Content>
    </Dialog.Root>
  );
}
