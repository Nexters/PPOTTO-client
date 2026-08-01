'use client';

import { useEffect } from 'react';

import { bridge } from '@/shared/lib/bridge';
import { installConsoleMirror } from '@/shared/lib/console-mirror';

export function ConsoleMirror() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    return installConsoleMirror((level, args) => bridge.send('LOG', { level, args }));
  }, []);

  return null;
}
