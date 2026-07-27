'use client';

import dynamic from 'next/dynamic';

// 웹뷰 앱 화면은 CSR-only
const Stack = dynamic(() => import('@/app/stackflow/stackflow').then((m) => m.Stack), {
  ssr: false,
});

export default function Page() {
  return <Stack />;
}
