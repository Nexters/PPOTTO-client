import { useStack } from '@stackflow/react';
import { useCallback, useEffect, useRef } from 'react';

/**
 * 화면이 닫히는 동안 들어온 중복 뒤로가기를 무시한다.
 * 전환 중 터치 차단은 React 커밋 이후에 걸리므로, 렌더가 밀리는 순간을 위해 ref로 즉시 잠근다.
 */
export function useSinglePop(pop: () => void) {
  const { transitionDuration } = useStack();
  const isPoppingRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    },
    [],
  );

  return useCallback(() => {
    if (isPoppingRef.current) return;
    isPoppingRef.current = true;

    // pop이 취소되면 화면이 남으므로, 전환 시간이 지나면 다시 누를 수 있게 푼다
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      isPoppingRef.current = false;
    }, transitionDuration);

    pop();
  }, [pop, transitionDuration]);
}
