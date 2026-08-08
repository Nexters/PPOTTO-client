import type { Metadata } from 'next';
import '@/app/styles/globals.css';

import { ConsoleMirror } from '@/app/providers/console-mirror';
import { QueryProvider } from '@/app/providers/query-provider';
import { cn } from '@/shared/lib/cn';
import { ToastProvider } from '@/shared/ui/common/Toast';

export const metadata: Metadata = {
  title: 'ppotto',
  description: '방치된 갤러리 사진을 테마별 스티커로 만드는 포토 리캡',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <div
          className={cn(
            'relative mx-auto flex min-h-screen w-full max-w-112.5',
            'flex-col',
            'shadow-[0_0_24px_rgba(0,0,0,0.08)] dark:shadow-[0_0_24px_rgba(0,0,0,0.5)]',
          )}
        >
          <ConsoleMirror />
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
        </div>
      </body>
    </html>
  );
}
