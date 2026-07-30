import type { paths } from '@ppotto/api';

type StickerRecapData =
  paths['/stickers/{stickerId}']['get']['responses']['200']['content']['application/json']['data'];

export const stickerFixture: StickerRecapData = {
  sticker: {
    id: '01983f2b-1a2b-7c3d-8e4f-5a6b7c8d9e0f',
    title: '동물 밈 짤줍',
    isNew: true,
    type: 'IMAGE',
    imageUrl: 'https://picsum.photos/seed/sticker/400/400',
    textContent: null,
    posX: 62.5,
    posY: 318.0,
    scale: 0.8,
    rotation: -12.0,
    zIndex: 3,
    badgeOffsetX: -24.0,
    badgeOffsetY: 96.0,
    badgeRotation: 0.0,
  },
  comments: [
    {
      id: '01983f2d-1a2b-7c3d-8e4f-5a6b7c8d9e0f',
      content: '야옹~',
      isFloat: true,
      posX: 0.0,
      posY: -140.0,
    },
    {
      id: '01983f2d-2b3c-7d4e-9f5a-6b7c8d9e0f1a',
      content: '또 주웠네!',
      isFloat: true,
      posX: -120.0,
      posY: -40.0,
    },
    {
      id: '01983f2d-3c4d-7e5f-a6b7-8c9d0e1f2a3b',
      content: '복슬복슬',
      isFloat: true,
      posX: 120.0,
      posY: -20.0,
    },
    {
      id: '01983f2d-4d5e-7f6a-b7c8-9d0e1f2a3b4c',
      content: '웃기고 귀여우면 일단 주워요',
      isFloat: false,
      posX: null,
      posY: null,
    },
    {
      id: '01983f2d-5e6f-7a7b-c8d9-0e1f2a3b4c5d',
      content: '냥집사',
      isFloat: false,
      posX: null,
      posY: null,
    },
    {
      id: '01983f2d-6f7a-7b8c-d9e0-1f2a3b4c5d6e',
      content: '웃긴 동물들',
      isFloat: false,
      posX: null,
      posY: null,
    },
    {
      id: '01983f2d-7a8b-7c9d-e0f1-2a3b4c5d6e7f',
      content: '당신은 밈 수집가?',
      isFloat: false,
      posX: null,
      posY: null,
    },
    {
      id: '01983f2d-8b9c-7d0e-f1a2-3b4c5d6e7f8a',
      content: '저장한 동물 짤 중 62%가 고양이다냥!',
      isFloat: false,
      posX: null,
      posY: null,
    },
  ],
  photos: [
    {
      id: '01983f2e-1a2b-7c3d-8e4f-5a6b7c8d9e0f',
      imageUrl: 'https://picsum.photos/seed/photo1/300/300',
      takenAt: '2026-06-14T13:22:10+09:00',
    },
    {
      id: '01983f2e-2b3c-7d4e-9f5a-6b7c8d9e0f1a',
      imageUrl: 'https://picsum.photos/seed/photo2/300/300',
      takenAt: '2026-07-02T19:05:44+09:00',
    },
    {
      id: '01983f2e-3c4d-7e5f-a6b7-8c9d0e1f2a3b',
      imageUrl: 'https://picsum.photos/seed/photo3/300/300',
      takenAt: '2026-07-10T09:15:00+09:00',
    },
    {
      id: '01983f2e-4d5e-7f6a-b7c8-9d0e1f2a3b4c',
      imageUrl: 'https://picsum.photos/seed/photo4/300/300',
      takenAt: '2026-07-14T11:40:00+09:00',
    },
    {
      id: '01983f2e-5e6f-7a7b-c8d9-0e1f2a3b4c5d',
      imageUrl: 'https://picsum.photos/seed/photo5/300/300',
      takenAt: '2026-07-18T16:25:00+09:00',
    },
    {
      id: '01983f2e-6f7a-7b8c-d9e0-1f2a3b4c5d6e',
      imageUrl: 'https://picsum.photos/seed/photo6/300/300',
      takenAt: '2026-07-22T20:10:00+09:00',
    },
  ],
};
