import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type DotBackgroundProps = {
  children?: ReactNode;
  className?: string;
};

export function DotBackground({ children, className }: DotBackgroundProps) {
  return (
    <div className={cn('relative min-h-dvh bg-black', className)}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
