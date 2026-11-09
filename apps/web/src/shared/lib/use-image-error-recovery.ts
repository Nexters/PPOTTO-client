import { useCallback, useRef } from 'react';

export function useImageErrorRecovery(recover: () => void) {
  const hasAttemptedRecovery = useRef(false);

  return useCallback(() => {
    if (hasAttemptedRecovery.current) return;

    hasAttemptedRecovery.current = true;
    recover();
  }, [recover]);
}
