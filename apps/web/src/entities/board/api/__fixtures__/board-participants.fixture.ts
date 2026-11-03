import type { components } from '@ppotto/api';

type BoardParticipants = components['schemas']['BoardParticipantsResponse'];

export const boardParticipantsFixture = {
  participantCount: 2,
  maxParticipantCount: 8,
  participants: [
    {
      userId: '019a4d10-0000-7000-8000-000000000001',
      name: '김용희',
      role: 'OWNER',
    },
    {
      userId: '019a4d10-0000-7000-8000-000000000002',
      name: '이수민',
      role: 'MEMBER',
    },
  ],
} satisfies BoardParticipants;
