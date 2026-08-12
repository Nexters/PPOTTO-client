import {
  clearQaDiagnostics,
  getQaDiagnostics,
  recordQaDiagnostic,
  sanitizeQaDiagnosticText,
} from './qa-diagnostics';

afterEach(clearQaDiagnostics);

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
