/**
 * API 응답에서 payload를 꺼내고, HTTP·네트워크·계약 오류를 구분한다.
 * 요청 준비, 응답 파싱, 요청 취소 중 발생한 오류는 원형 그대로 전파한다.
 *
 *   HttpError               서버가 응답하고 거절했다      → 사용자에게 안내
 *   NetworkError            서버에 닿지 못했다          → 재시도
 *   MalformedResponseError  2xx인데 payload가 없다    → 백엔드에 알림
 *
 * 성공 판단은 HTTP status만 본다. 엔벨로프의 success 필드는 보지 않는다.
 */

export class HttpError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly body: unknown;

  constructor(status: number, code: string | undefined, body: unknown) {
    super(code ? `HTTP ${status} ${code}` : `HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('네트워크 요청이 실패했습니다', { cause });
    this.name = 'NetworkError';
  }
}

export class MalformedResponseError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`HTTP ${status} 응답에 data가 없습니다`);
    this.name = 'MalformedResponseError';
    this.status = status;
    this.body = body;
  }
}

/** 모든 응답을 감싸는 ApiResponse 엔벨로프. 스펙이 data를 required로 잡지 않는다. */
type Envelope<T> = { success: boolean; data?: T; error?: unknown };

/** openapi-fetch의 결과 모양. 2xx면 바디가 data에, 그 외엔 error에 담긴다. */
type ApiResult<T> = { data?: Envelope<T>; error?: unknown; response: Response };

/** 에러 바디에서 code만 안전하게 꺼낸다. JSON이 아니면 error가 문자열로 오므로 매 단계 확인한다. */
function extractCode(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;

  const { error } = body as { error?: unknown };
  if (typeof error !== 'object' || error === null) return undefined;

  const { code } = error as { code?: unknown };
  return typeof code === 'string' ? code : undefined;
}

/** data를 반환하는 엔드포인트용. 엔벨로프를 벗겨 payload만 돌려준다. */
export async function unwrapData<T>(result: Promise<ApiResult<T>>): Promise<NonNullable<T>> {
  const { data, error, response } = await result;

  if (!response.ok) throw new HttpError(response.status, extractCode(error), error);

  const payload = data?.data;
  if (payload == null) throw new MalformedResponseError(response.status, data);

  return payload;
}

/** data가 없는 엔드포인트용. 성공 여부만 확인한다. */
export async function unwrapVoid(
  result: Promise<{ error?: unknown; response: Response }>,
): Promise<void> {
  const { error, response } = await result;

  if (!response.ok) throw new HttpError(response.status, extractCode(error), error);
}
