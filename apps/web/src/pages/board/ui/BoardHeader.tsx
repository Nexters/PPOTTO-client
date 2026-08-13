'use client';

import { IconSettings } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import Image from 'next/image';

import { cn } from '@/shared/lib/cn';

export function BoardHeader() {
  const { push } = useFlow();

  return (
    <div
      className={cn('absolute inset-x-0 top-0 z-60 flex flex-col items-start', 'px-6 pb-10')}
      style={{ backgroundImage: 'linear-gradient(to bottom, black 46%, transparent)' }}
    >
      <div className="flex items-center justify-between w-full">
        <Image src="/logo/Logo.svg" alt="PPOTTO" width={105} height={32} className="w-auto h-8" />
        <button type="button" aria-label="설정" onClick={() => push('Settings', {})}>
          <IconSettings color="white" />
        </button>
      </div>
    </div>
  );
}
