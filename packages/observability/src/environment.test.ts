import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveEnvironment, TRACE_PROPAGATION_TARGETS } from './environment.ts';

describe('resolveEnvironment', () => {
  it('dev API 호스트를 development로 판정한다', () => {
    assert.equal(resolveEnvironment('https://dev-api.ppotto.co.kr'), 'development');
  });

  it('production API 호스트를 production으로 판정한다', () => {
    assert.equal(resolveEnvironment('https://api.ppotto.co.kr'), 'production');
  });

  it('dev 호스트가 production 호스트를 문자열로 포함해도 development로 남는다', () => {
    assert.ok('https://dev-api.ppotto.co.kr'.includes('api.ppotto.co.kr'));
    assert.equal(resolveEnvironment('https://dev-api.ppotto.co.kr/'), 'development');
  });

  it('경로나 포트가 붙어도 호스트로 판정한다', () => {
    assert.equal(resolveEnvironment('https://api.ppotto.co.kr/users/me'), 'production');
    assert.equal(resolveEnvironment('https://dev-api.ppotto.co.kr:443'), 'development');
  });

  it('로컬 주소는 local로 판정한다', () => {
    assert.equal(resolveEnvironment('http://localhost:8080'), 'local');
    assert.equal(resolveEnvironment('http://10.10.7.137:8080'), 'local');
  });

  it('값이 없거나 URL이 아니면 local로 판정한다', () => {
    assert.equal(resolveEnvironment(undefined), 'local');
    assert.equal(resolveEnvironment(''), 'local');
    assert.equal(resolveEnvironment('not-a-url'), 'local');
  });

  it('알 수 없는 호스트는 local로 판정한다', () => {
    assert.equal(resolveEnvironment('https://ppotto.co.kr'), 'local');
    assert.equal(resolveEnvironment('https://evil-api.ppotto.co.kr.attacker.com'), 'local');
  });
});

describe('TRACE_PROPAGATION_TARGETS', () => {
  const matches = (url: string) => TRACE_PROPAGATION_TARGETS.some((target) => target.test(url));

  it('우리 API 호스트에는 전파한다', () => {
    assert.ok(matches('https://dev-api.ppotto.co.kr/users/me'));
    assert.ok(matches('https://api.ppotto.co.kr/boards'));
  });

  it('점을 이스케이프해 임의 문자와 매칭되지 않는다', () => {
    assert.equal(matches('https://apixppotto1co2kr/'), false);
  });

  it('외부 도메인에는 전파하지 않는다', () => {
    assert.equal(matches('https://storage.googleapis.com/ppotto-photos/a.jpg'), false);
    assert.equal(matches('https://kapi.kakao.com/v1/user'), false);
  });

  it('환경 판별과 같은 호스트 목록을 쓴다', () => {
    assert.equal(TRACE_PROPAGATION_TARGETS.length, 2);
  });
});
