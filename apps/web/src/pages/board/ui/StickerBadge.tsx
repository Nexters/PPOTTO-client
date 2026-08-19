'use client';

import { useRef, type Ref } from 'react';

import { cn } from '@/shared/lib/cn';

const TITLE_MAX_LENGTH = 15;

type StickerBadgeProps = {
  title: string;
  isNew?: boolean;
  isEditing?: boolean;
  onSubmit?: (title: string) => void;
  onCancel?: () => void;
  ref?: Ref<HTMLInputElement>;
};

export function StickerBadge({
  title,
  isNew,
  isEditing,
  onSubmit,
  onCancel,
  ref,
}: StickerBadgeProps) {
  const measureRef = useRef<HTMLSpanElement>(null);

  const submit = (input: HTMLInputElement) => {
    const nextTitle = input.value.slice(0, TITLE_MAX_LENGTH).trim();
    if (nextTitle && nextTitle !== title) onSubmit?.(nextTitle);
    else onCancel?.();
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        'rounded-full bg-white px-3 py-1.5',
      )}
    >
      <span
        ref={measureRef}
        aria-hidden={isEditing || undefined}
        className={cn('whitespace-pre text-caption-01 text-gray-900', isEditing && 'invisible')}
      >
        {title || '\u00a0'}
      </span>
      {isEditing && (
        <input
          ref={ref}
          defaultValue={title}
          maxLength={TITLE_MAX_LENGTH}
          className={cn(
            'absolute inset-y-1.5 right-3 left-3 min-w-0',
            'bg-transparent text-caption-01 text-nowrap',
            'text-gray-900 outline-none',
          )}
          // IME 조합 중엔 브라우저가 maxLength를 강제하지 않을 수 있다
          onInput={(event) => {
            const value = event.currentTarget.value.slice(0, TITLE_MAX_LENGTH);
            if (event.currentTarget.value !== value) event.currentTarget.value = value;
            if (measureRef.current) measureRef.current.textContent = value || '\u00a0';
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit(event.currentTarget);
            if (event.key === 'Escape') onCancel?.();
          }}
          onBlur={(event) => submit(event.currentTarget)}
        />
      )}
      {isNew && (
        <div
          className={cn(
            'absolute top-0 right-0.5 size-2 rounded-full',
            'ring-2 ring-white bg-red-400',
          )}
        />
      )}
    </div>
  );
}
