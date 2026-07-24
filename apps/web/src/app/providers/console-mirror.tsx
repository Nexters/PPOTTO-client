'use client';

import { useEffect } from 'react';

import { useBridge } from '@/shared/lib/bridge';
import { installConsoleMirror } from '@/shared/lib/console-mirror';

export function ConsoleMirror() {
  const bridge = useBridge();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    return installConsoleMirror((level, args) => bridge.send('LOG', { level, args }));
  }, [bridge]);

  return null;
}
