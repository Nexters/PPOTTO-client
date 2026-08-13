import {
  captureQaFetch,
  clearQaDiagnostics,
  getQaDiagnostics,
  recordQaDiagnostic,
  sanitizeQaDiagnosticText,
} from './qa-diagnostics';

const originalQaToolEnabled = process.env.EXPO_PUBLIC_QA_TOOL_ENABLED;

afterEach(() => {
  clearQaDiagnostics();
  if (originalQaToolEnabled === undefined) delete process.env.EXPO_PUBLIC_QA_TOOL_ENABLED;
  else process.env.EXPO_PUBLIC_QA_TOOL_ENABLED = originalQaToolEnabled;
});

it('QA 도구가 꺼져 있으면 네트워크 응답을 수집하지 않는다', async () => {
  process.env.EXPO_PUBLIC_QA_TOOL_ENABLED = 'false';
  const response = { status: 200 } as Response;
  const request = jest.fn().mockResolvedValue(response);

  await expect(captureQaFetch(request, 'https://example.com')).resolves.toBe(response);
  expect(request).toHaveBeenCalledTimes(1);
  expect(getQaDiagnostics()).toEqual([]);
});

it('직전 15초 이벤트만 남기고 민감한 값을 가린다', () => {
  const now = Date.now();
  recordQaDiagnostic({
    type: 'console',
    source: 'rn',
    at: now - 16_000,
    level: 'log',
    message: 'old',
  });
  recordQaDiagnostic({
    type: 'console',
    source: 'web',
    at: now,
    level: 'error',
    message: 'recent',
  });

  expect(getQaDiagnostics(now)).toEqual([
    expect.objectContaining({ source: 'web', message: 'recent' }),
  ]);
  expect(sanitizeQaDiagnosticText('{"accessToken":"abc","name":"qa"}')).toBe(
    '{"accessToken":"[REDACTED]","name":"qa"}',
  );
});
