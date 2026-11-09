import { type components, type paths, unwrapData, unwrapVoid } from '@ppotto/api';

import { api } from '@/shared/api/client';
import { publicApi } from '@/shared/api/public-client';

import {
  boardInvitationFixture,
  publicBoardInvitationFixture,
} from './__fixtures__/board-invitation.fixture';
import { boardFixture } from './__fixtures__/board.fixture';
import { boardParticipantsFixture } from './__fixtures__/board-participants.fixture';
import { boardSummaryListFixture } from './__fixtures__/board-summary-list.fixture';

// 스펙은 v1|v2 유니온이지만 웹은 항상 X-API-Version: 2를 보내므로 v2 타입으로 고정한다
type BoardDetailAnyVersion =
  paths['/boards/{boardId}']['get']['responses']['200']['content']['application/json']['data'];
export type BoardDetail = components['schemas']['BoardDetailV2Response'];

type BoardListAnyVersion =
  paths['/boards']['get']['responses']['200']['content']['application/json']['data'];
type BoardList = components['schemas']['BoardResponse'][];
export type BoardSummaryList = components['schemas']['BoardListV2Response'];
export type BoardSummary = components['schemas']['BoardSummaryV2Response'];
export type BoardParticipants = components['schemas']['BoardParticipantsResponse'];
export type BoardInvitationDetail = components['schemas']['BoardInvitationDetailResponse'];

export type CreateBoardInput =
  paths['/boards']['post']['requestBody']['content']['application/json'];
export type UpdateBoardInput =
  paths['/boards/{boardId}']['patch']['requestBody']['content']['application/json'];
export type UpdateBoardLayoutInput = components['schemas']['BoardLayoutV2Request'];
export type BoardInvitationIssue = components['schemas']['BoardInvitationIssueResponse'];
export type BoardInvitationPreviewUpload =
  components['schemas']['BoardInvitationPreviewUploadResponse'];
export type BoardShareScope = components['schemas']['BoardShareScope'];
export type SharedBoard = components['schemas']['SharedBoardResponse'];

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export const boardApi = {
  list: () => {
    if (USE_MOCK) return Promise.resolve([{ id: boardFixture.id, name: boardFixture.name }]);
    return unwrapData<BoardListAnyVersion>(api.GET('/boards')) as Promise<BoardList>;
  },
  listSummaries: () => {
    if (USE_MOCK) return Promise.resolve(boardSummaryListFixture);
    return unwrapData<BoardListAnyVersion>(
      api.GET('/boards', { params: { header: { 'X-API-Version': '2' } } }),
    ) as Promise<BoardSummaryList>;
  },
  get: (boardId: string) => {
    if (USE_MOCK) return Promise.resolve(boardFixture);
    return unwrapData<BoardDetailAnyVersion>(
      api.GET('/boards/{boardId}', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
      }),
    ) as Promise<BoardDetail>;
  },
  getParticipants: (boardId: string): Promise<BoardParticipants> => {
    if (USE_MOCK) return Promise.resolve(boardParticipantsFixture);
    return unwrapData(
      api.GET('/boards/{boardId}/participants', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
      }),
    );
  },
  updateLayout: (boardId: string, input: UpdateBoardLayoutInput) => {
    if (USE_MOCK) return Promise.resolve();
    return unwrapVoid(
      api.PATCH('/boards/{boardId}/layout', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
        body: input,
      }),
    );
  },
  // name을 생략하면 서버가 기본 이름을 붙인다
  create: (input: CreateBoardInput) => {
    if (USE_MOCK) return Promise.resolve({ id: boardFixture.id, name: input.name ?? '새 보드' });
    return unwrapData(
      api.POST('/boards', { params: { header: { 'X-API-Version': '2' } }, body: input }),
    );
  },
  update: (boardId: string, input: UpdateBoardInput) => {
    if (USE_MOCK) return Promise.resolve({ id: boardId, name: input.name });
    return unwrapData(
      api.PATCH('/boards/{boardId}', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
        body: input,
      }),
    );
  },
  delete: (boardId: string) => {
    if (USE_MOCK) return Promise.resolve();
    return unwrapVoid(
      api.DELETE('/boards/{boardId}', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
      }),
    );
  },
  getShareStatus: (boardId: string) => {
    if (USE_MOCK) return Promise.resolve({ shareToken: null, scope: 'RECAP' as const });
    return unwrapData(
      api.GET('/boards/{boardId}/share', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
      }),
    );
  },
  share: (boardId: string, scope: BoardShareScope) => {
    if (USE_MOCK) return Promise.resolve({ shareToken: 'mock-board-share-token', scope });
    return unwrapData(
      api.POST('/boards/{boardId}/share', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
        body: { scope },
      }),
    );
  },
  getShared: (shareToken: string) =>
    unwrapData(publicApi.GET('/boards/shared/{shareToken}', { params: { path: { shareToken } } })),
  getSharedRecap: (shareToken: string, stickerId: string) =>
    unwrapData(
      publicApi.GET('/boards/shared/{shareToken}/stickers/{stickerId}', {
        params: { path: { shareToken, stickerId } },
      }),
    ),
  issueInvitation: (boardId: string) => {
    if (USE_MOCK) {
      return Promise.resolve({
        code: 'K7P2QX',
        expiresAt: '2026-11-29T00:00:00Z',
        invitationId: '019a268d-15c8-7d31-8f42-90ad72d627f5',
        previewRequired: true,
      } satisfies BoardInvitationIssue);
    }
    return unwrapData(
      api.POST('/boards/{boardId}/invitations', {
        params: { path: { boardId }, header: { 'X-API-Version': '2' } },
      }),
    );
  },
  uploadInvitationPreview: (
    invitationId: string,
    code: string,
    file: Blob,
  ): Promise<BoardInvitationPreviewUpload> => {
    if (USE_MOCK) {
      return Promise.resolve({
        previewImageUrl: 'https://storage.googleapis.com/ppotto-board-invitations/preview.webp',
      });
    }

    const formData = new FormData();
    formData.append('code', code);
    formData.append('file', file, 'preview.webp');

    return unwrapData(
      api.PUT('/board-invitations/{invitationId}/preview', {
        params: { path: { invitationId }, header: { 'X-API-Version': '2' } },
        body: formData as unknown as { code: string; file: string },
      }),
    );
  },
  getInvitation: (code: string): Promise<BoardInvitationDetail> => {
    if (USE_MOCK) return Promise.resolve(boardInvitationFixture);
    return unwrapData(
      api.GET('/board-invitations/{code}', {
        params: { path: { code: code.trim().toUpperCase() } },
      }),
    );
  },
  getPublicInvitation: (code: string): Promise<BoardInvitationDetail> => {
    if (USE_MOCK) return Promise.resolve(publicBoardInvitationFixture);
    return unwrapData(
      publicApi.GET('/board-invitations/{code}', {
        params: { path: { code: code.trim().toUpperCase() } },
      }),
    );
  },
};
