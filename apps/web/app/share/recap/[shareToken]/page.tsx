import { HttpError } from '@ppotto/api';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { stickerApi } from '@/entities/sticker/api/sticker-api';
import { decodeShareOptions } from '@/pages/recap/model/share-options';

import { SharedRecapView } from './SharedRecapView';

type PageProps = {
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<{ o?: string }>;
};

async function loadRecap(shareToken: string) {
  try {
    return await stickerApi.getShared(shareToken);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { shareToken } = await params;
  const options = decodeShareOptions((await searchParams).o);

  const recap = await loadRecap(shareToken);
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
  const { shareToken } = await params;
  const options = decodeShareOptions((await searchParams).o);

  const recap = await loadRecap(shareToken);
  if (!recap) notFound();

  return <SharedRecapView data={recap} options={options} />;
}
