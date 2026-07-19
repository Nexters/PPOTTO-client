export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Network request failed', { cause });
    this.name = 'NetworkError';
  }
}

/**
 * openapi-fetch의 `{ data, error, response }` 반환을 data-또는-throw로 변환한다.
 * react-query의 queryFn/mutationFn은 실패 시 throw를 기대하므로 핸들러에서 이걸로 감싼다.
 */
export async function unwrap<T>(
  result: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let settled;
  try {
    settled = await result;
  } catch (cause) {
    throw new NetworkError(cause);
  }
  if (settled.error !== undefined || !settled.response.ok) {
    throw new HttpError(settled.response.status, settled.error);
  }
  return settled.data as T;
}
