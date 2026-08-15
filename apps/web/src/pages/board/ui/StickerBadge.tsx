'use client';

import { useState, type Ref } from 'react';

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
  const [value, setValue] = useState(title);
  const [prevIsEditing, setPrevIsEditing] = useState(isEditing);

  // 편집 진입 시 value 리셋 — effect 대신 렌더 중 처리해 재렌더 방지
  if (isEditing !== prevIsEditing) {
    setPrevIsEditing(isEditing);
    if (isEditing) setValue(title);
  }

  const submit = () => {
    const nextTitle = value.trim();
    if (nextTitle && nextTitle !== title) onSubmit?.(nextTitle);
    else onCancel?.();
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center gap-2',
        'rounded-full bg-white px-3 py-1.5',
      )}
    >
      {/* 조건부 마운트 시 동기 focus() 호출이 불가능해 항상 마운트함 */}
      <input
        ref={ref}
        readOnly={!isEditing}
        value={isEditing ? value : title}
        maxLength={TITLE_MAX_LENGTH}
        className={cn(
          'text-caption-01 text-nowrap field-sizing-content bg-transparent',
          'text-gray-900 outline-none',
          !isEditing && 'pointer-events-none',
        )}
        // IME 조합 중엔 브라우저가 maxLength를 강제하지 않아 직접 자름
        onChange={(event) => setValue(event.target.value.slice(0, TITLE_MAX_LENGTH))}
        onBlur={submit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
          if (event.key === 'Escape') onCancel?.();
        }}
      />
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
