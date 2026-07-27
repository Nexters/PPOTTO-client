import type { ReactNode } from 'react';

import { ConsoleMirror } from '@/app/providers/console-mirror';
import { QueryProvider } from '@/app/providers/query-provider';
import { BridgeProvider } from '@/shared/lib/bridge';

import './styles/globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <BridgeProvider>
          <QueryProvider>
            <ConsoleMirror />
            {children}
          </QueryProvider>
        </BridgeProvider>
      </body>
    </html>
  );
}
