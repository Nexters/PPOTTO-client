import { useActivity } from '@stackflow/react';
import { useEffect, useRef } from 'react';

export function useRefetchOnActive(refetch: () => unknown, isStale: boolean) {
  const { isActive } = useActivity();
  const wasActive = useRef(isActive);

  useEffect(() => {
    // 최초 마운트가 아니라 false→true로 바뀌는 재진입 순간에만 반응
    if (isActive && !wasActive.current && isStale) {
      refetch();
    }
    wasActive.current = isActive;
  }, [isActive, refetch, isStale]);
}
