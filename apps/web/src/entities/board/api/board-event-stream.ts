import { HttpError, NetworkError } from '@ppotto/api';

import { getApiAccessToken, handleApiAuthExpired } from '@/shared/api/auth-session';

const BOARD_LAYOUT_UPDATED = 'BOARD_LAYOUT_UPDATED';

export type BoardLayoutUpdatedEvent = {
  eventId: string;
  type: typeof BOARD_LAYOUT_UPDATED;
  boardId: string;
  occurredAt: string;
};

export type BoardEventSubscription = {
  close: () => void;
  done: Promise<void>;
};

type SubscribeBoardEventsOptions = {
  boardId: string;
  onOpen?: () => void;
  onEvent: (event: BoardLayoutUpdatedEvent) => void;
};

type ApiErrorBody = {
  error?: { code?: unknown };
};

async function readApiError(response: Response) {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

function getErrorCode(body: ApiErrorBody | undefined) {
  const code = body?.error?.code;
  return typeof code === 'string' ? code : undefined;
}

async function fetchBoardEventStream(boardId: string, signal: AbortSignal) {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  const request = async (forceRefresh: boolean) => {
    const accessToken = await getApiAccessToken(forceRefresh);
    return fetch(`${apiBaseUrl}/boards/${encodeURIComponent(boardId)}/events`, {
      headers: {
        Accept: 'text/event-stream',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        'X-API-Version': '2',
      },
      signal,
    });
  };

  let response: Response;
  try {
    response = await request(false);
    if (response.status === 401) {
      const error = await readApiError(response.clone());
      if (getErrorCode(error) === 'COMMON-004') response = await request(true);
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new NetworkError(error);
  }

  if (!response.ok) {
    const error = await readApiError(response);
    if (response.status === 401 && getErrorCode(error) === 'COMMON-004') {
      handleApiAuthExpired();
    }
    throw new HttpError(response.status, getErrorCode(error), error);
  }

  if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
    throw new TypeError('보드 이벤트 스트림 응답 형식이 올바르지 않습니다');
  }

  return response.body;
}

function isBoardLayoutUpdatedEvent(value: unknown): value is BoardLayoutUpdatedEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Partial<BoardLayoutUpdatedEvent>;
  return (
    event.type === BOARD_LAYOUT_UPDATED &&
    typeof event.eventId === 'string' &&
    typeof event.boardId === 'string' &&
    typeof event.occurredAt === 'string'
  );
}

function dispatchEvent(
  eventName: string,
  dataLines: string[],
  onEvent: (event: BoardLayoutUpdatedEvent) => void,
) {
  if (eventName !== BOARD_LAYOUT_UPDATED || dataLines.length === 0) return;

  const event: unknown = JSON.parse(dataLines.join('\n'));
  if (!isBoardLayoutUpdatedEvent(event)) {
    throw new TypeError('보드 이벤트 데이터 형식이 올바르지 않습니다');
  }
  onEvent(event);
}

async function consumeBoardEventStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: BoardLayoutUpdatedEvent) => void,
  onActivity: () => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';
  let dataLines: string[] = [];

  const consumeLine = (line: string) => {
    // SSE 스펙: 빈 줄이 하나의 이벤트가 끝났다는 경계
    if (line === '') {
      dispatchEvent(eventName, dataLines, onEvent);
      eventName = '';
      dataLines = [];
      return;
    }
    // ':'로 시작하는 줄은 주석(heartbeat)이라 무시
    if (line.startsWith(':')) return;

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const rawValue = separator === -1 ? '' : line.slice(separator + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;
    if (field === 'event') eventName = value;
    if (field === 'data') dataLines.push(value);
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onActivity();
      // 청크가 줄 중간에서 끊길 수 있어 버퍼에 누적 후 완성된 줄만 꺼내 처리
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
        buffer = buffer.slice(newlineIndex + 1);
        consumeLine(line);
        newlineIndex = buffer.indexOf('\n');
      }
    }

    buffer += decoder.decode();
    if (buffer) consumeLine(buffer.replace(/\r$/, ''));
    if (eventName || dataLines.length > 0) dispatchEvent(eventName, dataLines, onEvent);
  } finally {
    reader.releaseLock();
  }
}

export function subscribeBoardEvents({
  boardId,
  onOpen,
  onEvent,
}: SubscribeBoardEventsOptions): BoardEventSubscription {
  const controller = new AbortController();
  let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => controller.abort(), STREAM_INACTIVITY_TIMEOUT_MS);
  };
  const done = fetchBoardEventStream(boardId, controller.signal)
    .then((stream) => {
      onOpen?.();
      resetInactivityTimer();
      return consumeBoardEventStream(stream, onEvent, resetInactivityTimer);
    })
    .catch((error: unknown) => {
      if (isAbortError(error)) return;
      throw error;
    })
    .finally(() => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
    });

  return {
    close: () => controller.abort(),
    done,
  };
}

const STREAM_INACTIVITY_TIMEOUT_MS = 35_000;

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}
