import { HttpError } from '@ppotto/api';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { boardApi } from '@/entities/board/api/board-api';

import { SharedRecapView } from '../../../../recap/[shareToken]/SharedRecapView';

import { SharedRecapBackLink } from './SharedRecapBackLink';

type PageProps = {
  params: Promise<{ shareToken: string; stickerId: string }>;
};

async function loadRecap(shareToken: string, stickerId: string) {
  try {
    return await boardApi.getSharedRecap(shareToken, stickerId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareToken, stickerId } = await params;
  const recap = await loadRecap(shareToken, stickerId);
  return { title: recap ? `${recap.sticker.title} | ppotto` : 'ppotto' };
}

export default async function Page({ params }: PageProps) {
  const { shareToken, stickerId } = await params;
  const recap = await loadRecap(shareToken, stickerId);
  // 공유 범위 밖이거나 이 보드의 스티커가 아니면 보드로 돌려보낸다. 링크 자체가 무효면 보드에서 찾을 수 없음을 보여준다
  if (!recap) redirect(`/share/board/${shareToken}`);

  return (
    <div className="relative">
      <SharedRecapView
        data={recap}
        options={{
          image: true,
          summary: true,
          themeAnalysis: true,
          // 리캡까지만 공유된 링크는 서버가 사진을 빈 배열로 준다
          themePhotos: recap.photos.length > 0,
        }}
      />
      <SharedRecapBackLink shareToken={shareToken} />
    </div>
  );
}
