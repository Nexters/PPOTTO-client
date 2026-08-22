import type { Metadata, Viewport } from 'next';
import '@/app/styles/globals.css';

export const metadata: Metadata = {
  title: 'ppotto',
  description: '방치된 갤러리 사진을 테마별 스티커로 만드는 포토 리캡',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
