import { QueryProvider } from '@/app/providers/query-provider';
import { cn } from '@/shared/lib/cn';
import { ToastProvider } from '@/shared/ui/common/Toast';

export default function WebviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={cn(
        'relative mx-auto flex min-h-screen w-full max-w-112.5',
        // 배경은 body에 깔린 검정+도트를 그대로 비친다 — 여기에 bg-black을 주면
        // 자체 배경이 없는 화면(로그인·온보딩·약관)에서 도트가 덮여 사라진다
        'flex-col',
        'shadow-[0_0_24px_rgba(0,0,0,0.08)] dark:shadow-[0_0_24px_rgba(0,0,0,0.5)]',
      )}
      // 네이티브 웹뷰가 심어주는 --rn-safe-area-inset-top을 우선 쓰고(WKWebView 안에서는
      // env(safe-area-inset-top)이 0으로 계산되는 경우가 있어서), 없으면(일반 브라우저 등)
      // env()로 폴백한다
      style={{ paddingTop: 'var(--rn-safe-area-inset-top, env(safe-area-inset-top))' }}
    >
      <QueryProvider>
        <ToastProvider>{children}</ToastProvider>
      </QueryProvider>
    </div>
  );
}
