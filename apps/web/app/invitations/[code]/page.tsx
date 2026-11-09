import { HttpError } from '@ppotto/api';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { boardApi } from '@/entities/board/api/board-api';
import { BoardInvitationPage } from '@/pages/board-invitation';

type PageProps = {
  params: Promise<{ code: string }>;
};

async function loadInvitation(code: string) {
  try {
    return await boardApi.getPublicInvitation(code);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const invitation = await loadInvitation((await params).code);

  if (!invitation) return { title: '초대를 찾을 수 없어요 | ppotto' };

  const previewImage =
    invitation.previewImageUrl ?? 'https://ppotto.co.kr/invitations/default-preview.png';

  return {
    title: `${invitation.boardName} 보드 초대 | ppotto`,
    description: `${invitation.inviterName}님이 ${invitation.boardName} 보드에 초대했어요`,
    openGraph: {
      title: `${invitation.boardName} 보드 초대`,
      description: `${invitation.inviterName}님이 보드에 초대했어요`,
      images: [previewImage],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const invitation = await loadInvitation((await params).code);
  if (!invitation) notFound();

  return <BoardInvitationPage invitation={invitation} />;
}
