import { HttpError } from '@ppotto/api';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { boardApi } from '@/entities/board/api/board-api';

import { SharedBoardView } from './SharedBoardView';

type PageProps = {
  params: Promise<{ shareToken: string }>;
};

async function loadBoard(shareToken: string) {
  try {
    return await boardApi.getShared(shareToken);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareToken } = await params;
  const board = await loadBoard(shareToken);
  if (!board) return { title: '보드를 찾을 수 없어요 | ppotto' };

  const title = `${board.sharerName}님의 ${board.boardName}`;
  return { title: `${title} | ppotto`, openGraph: { title } };
}

export default async function Page({ params }: PageProps) {
  const { shareToken } = await params;
  const board = await loadBoard(shareToken);
  if (!board) notFound();

  return <SharedBoardView shareToken={shareToken} board={board} />;
}
