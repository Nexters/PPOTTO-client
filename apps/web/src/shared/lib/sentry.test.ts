import { describe, expect, it } from 'vitest';

import { SENTRY_TRACE_PROPAGATION_TARGETS } from './sentry';

function propagates(url: string) {
  return SENTRY_TRACE_PROPAGATION_TARGETS.some((pattern) => pattern.test(url));
}

describe('SENTRY_TRACE_PROPAGATION_TARGETS', () => {
  it.each([
    'https://api.ppotto.co.kr',
    'https://api.ppotto.co.kr/',
    'https://api.ppotto.co.kr/v1/boards',
    'https://api.ppotto.co.kr/v1/boards?cursor=1',
    'https://dev-api.ppotto.co.kr/v1/boards',
  ])('백엔드 API 요청에 trace 헤더를 붙인다: %s', (url) => {
    expect(propagates(url)).toBe(true);
  });

  it.each([
    'https://api.ppotto.co.kr.evil.com/steal',
    'https://evil.com/?next=https://api.ppotto.co.kr/v1/boards',
    'https://evil.com/api.ppotto.co.kr',
    'http://api.ppotto.co.kr/v1/boards',
    'https://storage.googleapis.com/ppotto-photos/1.jpg',
    'https://kapi.kakao.com/v2/user/me',
    'https://ppotto.co.kr/board',
  ])('그 밖의 도메인으로는 trace 헤더를 흘리지 않는다: %s', (url) => {
    expect(propagates(url)).toBe(false);
  });
});
