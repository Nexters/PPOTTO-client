'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
};

export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          {...(description ? null : { 'aria-describedby': undefined })}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'modal-content',
            'flex w-78 max-w-[calc(100vw-48px)] flex-col items-center gap-4',
            'rounded-16 bg-gray-900 p-4',
          )}
        >
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <Dialog.Title className="text-white text-body-03">{title}</Dialog.Title>
            {description && (
              <Dialog.Description className="text-gray-500 text-caption-01">
                {description}
              </Dialog.Description>
            )}
          </div>
          <div className="flex items-center w-full gap-2">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const actionClassName = 'text-body-04 flex-1 rounded-full px-7 py-2';

function ModalCancel({ className, ...props }: ComponentProps<'button'>) {
  return (
    <Dialog.Close
      type="button"
      className={cn(actionClassName, 'bg-gray-800 text-white', className)}
      {...props}
    />
  );
}

function ModalConfirm({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(actionClassName, 'bg-white text-black', className)}
      {...props}
    />
  );
}

Modal.Cancel = ModalCancel;
Modal.Confirm = ModalConfirm;
