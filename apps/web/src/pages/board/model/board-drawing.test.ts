/**
 * 동작 범위 (2026-08-13 — 펜 드로잉 데이터 연동 1b)
 *
 * board-drawing.ts는 draw 모드에서 캡처한 점들을 다루는 순수 함수를 담당한다.
 *
 * shouldSampleStrokePoint: pointermove로 들어오는 후보 점을 stroke에 채택할지 판단한다.
 * 직전 채택 점에서 일정 거리(보드 좌표 3단위 — 화면 픽셀 아님, 줌 배율에 따라 화면상 간격이
 * 달라짐) 이상 떨어졌을 때만 채택해, 손을 거의 안 움직여도 점이 불필요하게 쌓이는 것을 막는다.
 *
 * toDrawingCreateInput: 캡처된 점 + 색상/굵기를 저장 API 요청 형태로 직렬화한다. scope는 항상
 * 'BOARD'로 고정한다 — 스티커 귀속(scope='STICKER') 판단 기준이 아직 정해지지 않아 이번 작업
 * 범위에서 제외했다(별도 이슈에서 다룸).
 *
 * toPathData: 점들을 SVG path의 d 속성 문자열로 변환한다.
 */
import { describe, expect, it } from 'vitest';

import { shouldSampleStrokePoint, toDrawingCreateInput, toPathData } from './board-drawing';

describe('shouldSampleStrokePoint', () => {
  it('아직 채택된 점이 없으면 항상 채택한다', () => {
    expect(shouldSampleStrokePoint([], { x: 0, y: 0 })).toBe(true);
  });

  it('직전 채택 점에서 임계 거리보다 가까우면 채택하지 않는다', () => {
    const points = [{ x: 0, y: 0 }];

    expect(shouldSampleStrokePoint(points, { x: 1, y: 1 })).toBe(false);
  });

  it('직전 채택 점에서 임계 거리 이상 떨어지면 채택한다', () => {
    const points = [{ x: 0, y: 0 }];

    expect(shouldSampleStrokePoint(points, { x: 3, y: 0 })).toBe(true);
  });

  it('여러 점 중 마지막으로 채택된 점 기준으로 판단한다', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ];

    expect(shouldSampleStrokePoint(points, { x: 101, y: 100 })).toBe(false);
  });
});

describe('toDrawingCreateInput', () => {
  it('scope를 항상 BOARD로 직렬화한다', () => {
    const result = toDrawingCreateInput([{ x: 0, y: 0 }], { color: '#FFD400', strokeWidth: 4 });

    expect(result.scope).toBe('BOARD');
  });

  it('점 배열을 [x, y] 쌍 배열로 변환해 stroke.points에 담는다', () => {
    const points = [
      { x: 10.5, y: 22 },
      { x: 14.2, y: 25.1 },
    ];

    const result = toDrawingCreateInput(points, { color: '#FFD400', strokeWidth: 4 });

    expect(result.stroke).toEqual({
      points: [
        [10.5, 22],
        [14.2, 25.1],
      ],
    });
  });

  it('color/strokeWidth를 그대로 전달한다', () => {
    const result = toDrawingCreateInput([{ x: 0, y: 0 }], { color: '#FF5A5A', strokeWidth: 3 });

    expect(result.color).toBe('#FF5A5A');
    expect(result.strokeWidth).toBe(3);
  });

  it('호출할 때마다 서로 다른 id를 부여한다', () => {
    const first = toDrawingCreateInput([{ x: 0, y: 0 }], { color: '#fff', strokeWidth: 1 });
    const second = toDrawingCreateInput([{ x: 0, y: 0 }], { color: '#fff', strokeWidth: 1 });

    expect(first.id).not.toBe(second.id);
  });
});

describe('toPathData', () => {
  it('점이 없으면 빈 문자열을 반환한다', () => {
    expect(toPathData([])).toBe('');
  });

  it('점이 하나면 이동 명령(M)만 반환한다', () => {
    expect(toPathData([{ x: 10, y: 20 }])).toBe('M10,20');
  });

  it('점이 여러 개면 첫 점은 M, 나머지는 L로 이어 반환한다', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 15 },
    ];

    expect(toPathData(points)).toBe('M0,0 L10,5 L20,15');
  });
});
