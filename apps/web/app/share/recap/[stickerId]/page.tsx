import { HttpError } from '@ppotto/api';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { stickerApi } from '@/entities/sticker/api/sticker-api';

import { SharedRecapView } from './SharedRecapView';

type PageProps = {
  params: Promise<{ stickerId: string }>;
};

async function loadRecap(stickerId: string) {
  try {
    return await stickerApi.getPublic(stickerId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { stickerId } = await params;
  const recap = await loadRecap(stickerId);
  if (!recap) return { title: '리캡을 찾을 수 없어요 | ppotto' };

  return {
    title: `${recap.sticker.title} | ppotto`,
    description: recap.summary,
    openGraph: {
      title: recap.sticker.title,
      description: recap.summary,
      images: recap.sticker.imageUrl ? [recap.sticker.imageUrl] : undefined,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { stickerId } = await params;
  const recap = await loadRecap(stickerId);
  if (!recap) notFound();

  return <SharedRecapView data={recap} />;
}
