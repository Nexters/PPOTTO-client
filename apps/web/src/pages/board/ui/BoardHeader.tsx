import { IconSettings } from '@ppotto/assets';
import Image from 'next/image';

import { cn } from '@/shared/lib/cn';

export function BoardHeader() {
  return (
    <div
      className={cn('absolute inset-x-0 top-0 z-10 flex flex-col items-start', 'px-6 pt-16 pb-16')}
      style={{ backgroundImage: 'linear-gradient(to bottom, black, transparent)' }}
    >
      <div className="flex w-full items-center justify-between">
        <Image src="/logo/Logo.svg" alt="PPOTTO" width={105} height={32} className="h-8 w-auto" />
        <button type="button" aria-label="설정">
          <IconSettings className="text-white" />
        </button>
      </div>
    </div>
  );
}
