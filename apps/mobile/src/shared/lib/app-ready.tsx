import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// 앱 시작 화면을 언제까지 붙잡을지 판단하는 단일 신호.
// 첫 화면이 그려졌다고 웹뷰가 알려오면(BOARD_READY / onLoadEnd) 켜진다.
type AppReadyValue = {
  isReady: boolean;
  markReady: () => void;
};

const AppReadyContext = createContext<AppReadyValue | null>(null);

const appStartedAt = Date.now();

function useAppReadyContext() {
  const value = useContext(AppReadyContext);
  if (!value) throw new Error('AppReadyProvider 안에서만 쓸 수 있어요.');
  return value;
}

/** 첫 화면이 그려졌음을 알린다. 여러 번 불러도 처음 한 번만 반영된다. */
export function useMarkAppReady() {
  return useAppReadyContext().markReady;
}

export function useIsAppReady() {
  return useAppReadyContext().isReady;
}

export function AppReadyProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const markedRef = useRef(false);

  const markReady = useCallback(() => {
    if (markedRef.current) return;
    markedRef.current = true;
    // 스플래시 상한(3s)을 넘기는지 판단하려고 남긴다 — 첫 화면까지 실제로 걸린 시간
    if (__DEV__) console.warn(`[launch] ready +${Date.now() - appStartedAt}ms`);
    setIsReady(true);
  }, []);

  const value = useMemo(() => ({ isReady, markReady }), [isReady, markReady]);

  return <AppReadyContext.Provider value={value}>{children}</AppReadyContext.Provider>;
}
