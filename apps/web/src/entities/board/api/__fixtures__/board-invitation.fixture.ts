import type { components } from '@ppotto/api';

type BoardInvitationDetail = components['schemas']['BoardInvitationDetailResponse'];

export const boardInvitationFixture = {
  boardId: '019a0000-0000-7000-8000-000000000001',
  boardName: '제주 여행',
  code: 'K7P2QX',
  expiresAt: '2026-12-09T00:00:00Z',
  inviterName: '김용희',
  maxParticipantCount: 8,
  participantCount: 2,
  participants: [
    { name: '김용희', role: 'OWNER' },
    { name: '이수민', role: 'MEMBER' },
  ],
  previewImageUrl: 'https://storage.googleapis.com/ppotto-board-invitations/preview.webp',
  stickerCount: 9,
  viewerStatus: 'NOT_JOINED',
} satisfies BoardInvitationDetail;

export const publicBoardInvitationFixture = {
  boardId: boardInvitationFixture.boardId,
  boardName: boardInvitationFixture.boardName,
  code: boardInvitationFixture.code,
  expiresAt: boardInvitationFixture.expiresAt,
  inviterName: boardInvitationFixture.inviterName,
  maxParticipantCount: boardInvitationFixture.maxParticipantCount,
  participantCount: boardInvitationFixture.participantCount,
  previewImageUrl: boardInvitationFixture.previewImageUrl,
  stickerCount: boardInvitationFixture.stickerCount,
} satisfies BoardInvitationDetail;
