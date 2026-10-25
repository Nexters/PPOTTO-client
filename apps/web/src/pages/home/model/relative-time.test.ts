import { expect, it } from 'vitest';

import { formatRelativeTime } from './relative-time';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const elapsed = (ms: number) => new Date(NOW - ms).toISOString();

it.each([
  ['1분 미만', 59 * 1000, '지금 막'],
  ['1분', MINUTE_MS, '1분 전'],
  ['59분', 59 * MINUTE_MS, '59분 전'],
  ['1시간', HOUR_MS, '1시간 전'],
  ['23시간', 23 * HOUR_MS, '23시간 전'],
  ['1일', DAY_MS, '1일 전'],
  ['6일', 6 * DAY_MS, '6일 전'],
  ['7일', 7 * DAY_MS, '1주 전'],
  ['29일', 29 * DAY_MS, '4주 전'],
  ['30일', 30 * DAY_MS, '1개월 전'],
  ['364일', 364 * DAY_MS, '12개월 전'],
  ['365일', 365 * DAY_MS, '1년 전'],
])('%s 지났으면 "%s" 단위로 내림해 표시한다', (_label, ms, expected) => {
  expect(formatRelativeTime(elapsed(ms), NOW)).toBe(expected);
});

it('기기 시계가 서버보다 느려 미래 시각이 오면 지금 막으로 표시한다', () => {
  expect(formatRelativeTime(elapsed(-5 * MINUTE_MS), NOW)).toBe('지금 막');
});
