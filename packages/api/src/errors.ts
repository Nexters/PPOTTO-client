export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

/** openapi-fetch 결과에서 data만 추출. 4xx/5xx → HttpError, 그 외 예외는 원형 전파 */
export async function unwrap<T>(
  result: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const settled = await result;
  if (settled.error !== undefined || !settled.response.ok) {
    throw new HttpError(settled.response.status, settled.error);
  }
  return settled.data as T;
}
