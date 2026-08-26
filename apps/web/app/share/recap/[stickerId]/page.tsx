import { HttpError } from '@ppotto/api';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { stickerApi } from '@/entities/sticker/api/sticker-api';
import { verifyShareOptions } from '@/shared/lib/recap-share-signature';

import { SharedRecapView } from './SharedRecapView';

type PageProps = {
  params: Promise<{ stickerId: string }>;
  searchParams: Promise<{ o?: string; sig?: string }>;
};

async function loadRecap(stickerId: string) {
  try {
    return await stickerApi.getPublic(stickerId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { stickerId } = await params;
  const { o, sig } = await searchParams;
  const options = verifyShareOptions(stickerId, o ?? null, sig ?? null);
  if (!options) return { title: '리캡을 찾을 수 없어요 | ppotto' };

  const recap = await loadRecap(stickerId);
  if (!recap) return { title: '리캡을 찾을 수 없어요 | ppotto' };

  return {
    title: `${recap.sticker.title} | ppotto`,
    description: options.summary ? recap.summary : undefined,
    openGraph: {
      title: recap.sticker.title,
      description: options.summary ? recap.summary : undefined,
      images: options.image && recap.sticker.imageUrl ? [recap.sticker.imageUrl] : undefined,
    },
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { stickerId } = await params;
  const { o, sig } = await searchParams;
  const options = verifyShareOptions(stickerId, o ?? null, sig ?? null);
  if (!options) notFound();

  const recap = await loadRecap(stickerId);
  if (!recap) notFound();

  return <SharedRecapView data={recap} options={options} />;
}
