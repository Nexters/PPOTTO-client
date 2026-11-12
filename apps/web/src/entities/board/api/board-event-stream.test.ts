import { afterEach, describe, expect, it, vi } from 'vitest';

const { getApiAccessToken, handleApiAuthExpired } = vi.hoisted(() => ({
  getApiAccessToken: vi.fn(),
  handleApiAuthExpired: vi.fn(),
}));
vi.mock('@/shared/api/auth-session', () => ({ getApiAccessToken, handleApiAuthExpired }));

import { subscribeBoardEvents } from './board-event-stream';

const encoder = new TextEncoder();

function createStream(chunks: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

function createEventResponse(chunks: string[]) {
  return new Response(createStream(chunks), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream;charset=UTF-8' },
  });
}

describe('subscribeBoardEvents', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('인증 헤더로 연결하고 청크에 나뉜 보드 이벤트를 전달한다', async () => {
    getApiAccessToken.mockResolvedValue('access-token');
    const fetch = vi
      .fn()
      .mockResolvedValue(
        createEventResponse([
          ':heartbeat\r\n\r\nevent: BOARD_LAYOUT_',
          'UPDATED\r\ndata: {"eventId":"event-1","type":"BOARD_LAYOUT_UPDATED",',
          '"boardId":"board-1","occurredAt":"2026-11-13T00:00:00Z"}\r\n\r\n',
        ]),
      );
    vi.stubGlobal('fetch', fetch);
    const onEvent = vi.fn();

    const subscription = subscribeBoardEvents({ boardId: 'board-1', onEvent });
    await subscription.done;

    expect(fetch).toHaveBeenCalledWith('/boards/board-1/events', {
      headers: {
        Accept: 'text/event-stream',
        Authorization: 'Bearer access-token',
        'X-API-Version': '2',
      },
      signal: expect.any(AbortSignal),
    });
    expect(onEvent).toHaveBeenCalledWith({
      eventId: 'event-1',
      type: 'BOARD_LAYOUT_UPDATED',
      boardId: 'board-1',
      occurredAt: '2026-11-13T00:00:00Z',
    });
  });

  it('만료된 토큰이면 한 번 갱신해 다시 연결한다', async () => {
    getApiAccessToken.mockResolvedValueOnce('expired-token').mockResolvedValueOnce('new-token');
    const expired = new Response(
      JSON.stringify({ success: false, error: { code: 'COMMON-004' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(expired)
      .mockResolvedValueOnce(createEventResponse([]));
    vi.stubGlobal('fetch', fetch);

    const subscription = subscribeBoardEvents({ boardId: 'board-1', onEvent: vi.fn() });
    await subscription.done;

    expect(getApiAccessToken).toHaveBeenNthCalledWith(1, false);
    expect(getApiAccessToken).toHaveBeenNthCalledWith(2, true);
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer new-token' },
    });
  });

  it('연결 전 서버 오류를 HttpError로 반환한다', async () => {
    getApiAccessToken.mockResolvedValue('access-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: { code: 'BOARD-002' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const subscription = subscribeBoardEvents({ boardId: 'missing-board', onEvent: vi.fn() });

    await expect(subscription.done).rejects.toMatchObject({
      name: 'HttpError',
      status: 404,
      code: 'BOARD-002',
    });
  });

  it('구독을 닫으면 연결 요청을 취소한다', async () => {
    getApiAccessToken.mockResolvedValue('access-token');
    const fetch = vi.fn().mockResolvedValue(createEventResponse([]));
    vi.stubGlobal('fetch', fetch);

    const subscription = subscribeBoardEvents({ boardId: 'board-1', onEvent: vi.fn() });
    subscription.close();

    await subscription.done;
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(request.signal?.aborted).toBe(true);
  });
});
