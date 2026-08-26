import type { Viewport } from 'next';
import { redirect } from 'next/navigation';

import { LandingPage } from '@/pages/landing/LandingPage';

// 랜딩은 일반 웹 페이지 — 웹뷰와 달리 확대를 막지 않는다
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

type PageProps = {
  searchParams: Promise<{ nativePlatform?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  // 구버전 앱(1.0.1)의 로그인 웹뷰는 루트 URL을 연다 — 웹뷰 진입(nativePlatform 쿼리)이면
  // 랜딩 대신 로그인으로 보낸다. 쿼리는 LoginPage의 플랫폼 분기에 쓰이므로 보존한다.
  const { nativePlatform } = await searchParams;
  if (nativePlatform) redirect(`/login?nativePlatform=${encodeURIComponent(nativePlatform)}`);

  return <LandingPage />;
}
