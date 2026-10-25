import { expect, it } from 'vitest';

import { formatRelativeTime } from './relative-time';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const elapsed = (ms: number) => new Date(NOW - ms).toISOString();

it.each([
  { label: '1분 미만', ms: 59 * 1000, expected: '지금 막' },
  { label: '1분', ms: MINUTE_MS, expected: '1분 전' },
  { label: '59분', ms: 59 * MINUTE_MS, expected: '59분 전' },
  { label: '1시간', ms: HOUR_MS, expected: '1시간 전' },
  { label: '23시간', ms: 23 * HOUR_MS, expected: '23시간 전' },
  { label: '1일', ms: DAY_MS, expected: '1일 전' },
  { label: '6일', ms: 6 * DAY_MS, expected: '6일 전' },
  { label: '7일', ms: 7 * DAY_MS, expected: '1주 전' },
  { label: '29일', ms: 29 * DAY_MS, expected: '4주 전' },
  { label: '30일', ms: 30 * DAY_MS, expected: '1개월 전' },
  { label: '364일', ms: 364 * DAY_MS, expected: '12개월 전' },
  { label: '365일', ms: 365 * DAY_MS, expected: '1년 전' },
])('$label 지났으면 $expected(으)로 내림해 표시한다', ({ ms, expected }) => {
  expect(formatRelativeTime(elapsed(ms), NOW)).toBe(expected);
});

it('기기 시계가 서버보다 느려 미래 시각이 오면 지금 막으로 표시한다', () => {
  expect(formatRelativeTime(elapsed(-5 * MINUTE_MS), NOW)).toBe('지금 막');
});
