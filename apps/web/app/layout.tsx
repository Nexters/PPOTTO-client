import type { Metadata } from 'next';
import '@/app/styles/globals.css';

import { QueryProvider } from '@/app/providers/query-provider';
import { BridgeProvider } from '@/shared/lib/bridge';
import { cn } from '@/shared/lib/cn';

export const metadata: Metadata = {
  title: 'gallery-100',
  description: '방치된 갤러리 사진을 테마별 스티커로 만드는 포토 리캡',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#f4f4f2] dark:bg-zinc-900">
        <div
          className={cn(
            'mx-auto flex min-h-screen w-full max-w-[450px] flex-col bg-background',
            'shadow-[0_0_24px_rgba(0,0,0,0.08)] dark:shadow-[0_0_24px_rgba(0,0,0,0.5)]',
          )}
        >
          <BridgeProvider>
            <QueryProvider>{children}</QueryProvider>
          </BridgeProvider>
        </div>
      </body>
    </html>
  );
}
