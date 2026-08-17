'use client';

import * as Dialog from '@radix-ui/react-dialog';

import { cn } from '@/shared/lib/cn';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayClassName?: string;
  animateOverlay?: boolean;
};

export function BottomSheet({
  isOpen,
  onClose,
  children,
  overlayClassName = 'backdrop-blur-[30px]',
  animateOverlay = true,
}: BottomSheetProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Overlay
        className={cn(animateOverlay && 'modal-overlay', 'fixed inset-0 z-50', overlayClassName)}
      />
      <Dialog.Content
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
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
