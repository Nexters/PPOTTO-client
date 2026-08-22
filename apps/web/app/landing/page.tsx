import type { Viewport } from 'next';

import { LandingPage } from '@/pages/landing/LandingPage';

// 랜딩은 일반 웹 페이지 — 웹뷰와 달리 확대를 막지 않는다
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function Page() {
  return <LandingPage />;
}
