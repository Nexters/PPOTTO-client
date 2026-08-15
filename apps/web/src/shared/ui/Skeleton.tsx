import type { CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={cn('skeleton rounded-8', className)} style={style} />;
}
