'use client';

import { Drawer } from 'vaul';

import { cn } from '@/shared/lib/cn';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayClassName?: string;
  animateOverlay?: boolean;
  animateContent?: boolean;
};

export function BottomSheet({
  isOpen,
  onClose,
  children,
  overlayClassName = 'backdrop-blur-[30px]',
  animateOverlay = true,
  animateContent = true,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()} noBodyStyles>
      <Drawer.Overlay
        className={cn('fixed inset-0 z-50', overlayClassName)}
        style={animateOverlay ? undefined : { animation: 'none' }}
      />
      <Drawer.Content
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'flex flex-col gap-5 rounded-t-3xl bg-gray-900 pt-4',
          'pr-6 pl-6',
        )}
        style={{
          paddingBottom:
            'calc(var(--rn-safe-area-inset-bottom, env(safe-area-inset-bottom)) + 2.5rem)',
          ...(animateContent ? undefined : { animation: 'none' }),
        }}
      >
        <Drawer.Title className="sr-only">스티커 퀵메뉴</Drawer.Title>
        <div className="mx-auto h-1 w-14 shrink-0 rounded-full bg-gray-700" />
        {children}
      </Drawer.Content>
    </Drawer.Root>
  );
}
