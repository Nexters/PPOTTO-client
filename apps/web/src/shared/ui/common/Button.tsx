import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

const buttonSizeClassName = {
  large: 'h-12 w-full px-4 text-body-03',
  medium: 'h-10 gap-2 py-2 pl-3 pr-4 text-body-05',
  small: 'h-[26px] px-2 text-caption-01',
} as const;

type ButtonProps = ComponentProps<'button'> & {
  size?: keyof typeof buttonSizeClassName;
  leftIcon?: ReactNode;
};

// 일반 버튼
export function Button({
  size = 'large',
  leftIcon,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-white text-black disabled:bg-gray-800 disabled:text-gray-500',
        buttonSizeClassName[size],
        className,
      )}
      {...props}
    >
      {leftIcon && <span className="flex items-center justify-center size-6">{leftIcon}</span>}
      {children}
    </button>
  );
}

// 아이콘만 있는 버튼
export function IconButton({
  type = 'button',
  className,
  children,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-white text-black disabled:bg-gray-800 disabled:text-gray-500',
        className,
      )}
      {...props}
    >
      <span className="flex items-center justify-center size-7">{children}</span>
    </button>
  );
}
