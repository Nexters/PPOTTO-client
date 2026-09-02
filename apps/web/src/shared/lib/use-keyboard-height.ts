'use client';

import { useEffect, useState } from 'react';

import { bridge } from '@/shared/lib/bridge';

export function useKeyboardHeight(enabled: boolean): number {
  const [height, setHeight] = useState(0);
  const [prevEnabled, setPrevEnabled] = useState(enabled);

  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled);
    setHeight(0);
  }

  useEffect(() => {
    if (!enabled) return;
    return bridge.on('KEYBOARD_HEIGHT_CHANGED', (payload) => setHeight(payload.height));
  }, [enabled]);

  return height;
}
