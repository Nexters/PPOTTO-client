/**
 * 동작 범위 (2026-08-13 — 펜 드로잉 데이터 연동 1b)
 *
 * board-drawing.ts는 draw 모드에서 캡처한 점들을 다루는 순수 함수를 담당한다.
 *
 * shouldSampleStrokePoint: pointermove로 들어오는 후보 점을 stroke에 채택할지 판단한다.
 * 직전 채택 점에서 일정 거리(보드 좌표 2단위 — 화면 픽셀 아님, 줌 배율에 따라 화면상 간격이
 * 달라짐) 이상 떨어졌을 때만 채택해, 손을 거의 안 움직여도 점이 불필요하게 쌓이는 것을 막는다.
 *
 * toDrawingCreateInput: 캡처된 점 + 색상/굵기를 저장 API 요청 형태로 직렬화한다. scope는 항상
 * 'BOARD'로 고정한다 — 스티커 귀속(scope='STICKER') 판단 기준이 아직 정해지지 않아 이번 작업
 * 범위에서 제외했다(별도 이슈에서 다룸).
 *
 * toPathData: 점들을 SVG path의 d 속성 문자열로 변환한다.
 *
 * parseStrokePoints: 저장된 그림의 stroke(자유 형식 JSON)에서 점 배열을 복원한다. toDrawingCreateInput이
 * 쓴 형식({ points: [x, y][] })만 인식하고, 그 외(다른 클라이언트가 다른 형식으로 저장했거나 손상된 데이터)는
 * 빈 배열로 취급해 렌더링이 깨지지 않게 한다.
 */
import { describe, expect, it } from 'vitest';

import {
  getDrawingBounds,
  hitTestDrawingId,
  parseStrokePoints,
  shouldSampleStrokePoint,
  toDrawingCreateInput,
  toPathData,
  type ParsedDrawing,
} from './board-drawing';

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

    expect(shouldSampleStrokePoint(points, { x: 2, y: 0 })).toBe(true);
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

describe('parseStrokePoints', () => {
  it('toDrawingCreateInput이 만든 형식을 점 배열로 복원한다', () => {
    const stroke = {
      points: [
        [10.5, 22],
        [14.2, 25.1],
      ],
    };

    expect(parseStrokePoints(stroke)).toEqual([
      { x: 10.5, y: 22 },
      { x: 14.2, y: 25.1 },
    ]);
  });

  it('points 필드가 없으면 빈 배열을 반환한다', () => {
    expect(parseStrokePoints({})).toEqual([]);
  });

  it('stroke가 null/undefined면 빈 배열을 반환한다', () => {
    expect(parseStrokePoints(null)).toEqual([]);
    expect(parseStrokePoints(undefined)).toEqual([]);
  });

  it('points가 배열이 아니면 빈 배열을 반환한다', () => {
    expect(parseStrokePoints({ points: 'invalid' })).toEqual([]);
  });

  it('[x, y] 쌍이 아닌 항목은 걸러내고 나머지만 복원한다', () => {
    const stroke = {
      points: [[1, 2], 'invalid', [3], [4, 5]],
    };

    expect(parseStrokePoints(stroke)).toEqual([
      { x: 1, y: 2 },
      { x: 4, y: 5 },
    ]);
  });
});

function fakeDrawing(overrides: Partial<ParsedDrawing> = {}): ParsedDrawing {
  return {
    id: 'drawing-1',
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    color: '#fff',
    strokeWidth: 0,
    ...overrides,
  };
}

describe('hitTestDrawingId', () => {
  it('선 위의 점을 찍으면 그 그림의 id를 반환한다', () => {
    const drawing = fakeDrawing({ id: 'a' });

    expect(hitTestDrawingId({ x: 5, y: 0 }, [drawing])).toBe('a');
  });

  it('선에서 여유 거리(HIT_TEST_TOLERANCE) 이내면 히트로 본다', () => {
    const drawing = fakeDrawing({ id: 'a' });

    expect(hitTestDrawingId({ x: 5, y: 8 }, [drawing])).toBe('a');
  });

  it('여유 거리보다 멀면 히트로 보지 않는다', () => {
    const drawing = fakeDrawing({ id: 'a' });

    expect(hitTestDrawingId({ x: 5, y: 9 }, [drawing])).toBeNull();
  });

  it('여러 그림이 겹치면 나중에 그려진(배열 뒤쪽) 것을 반환한다', () => {
    const first = fakeDrawing({ id: 'a' });
    const second = fakeDrawing({ id: 'b' });

    expect(hitTestDrawingId({ x: 5, y: 0 }, [first, second])).toBe('b');
  });

  it('점이 하나뿐인 그림은 그 점을 중심으로 한 원형 범위로 히트를 판단한다', () => {
    const drawing = fakeDrawing({ id: 'a', points: [{ x: 5, y: 5 }] });

    expect(hitTestDrawingId({ x: 13, y: 5 }, [drawing])).toBe('a');
    expect(hitTestDrawingId({ x: 14, y: 5 }, [drawing])).toBeNull();
  });

  it('그림이 하나도 없으면 null을 반환한다', () => {
    expect(hitTestDrawingId({ x: 0, y: 0 }, [])).toBeNull();
  });
});

describe('getDrawingBounds', () => {
  it('점이 없으면 null을 반환한다', () => {
    expect(getDrawingBounds([], 4)).toBeNull();
  });

  it('점이 하나면 strokeWidth만큼 패딩된 정사각형을 반환한다', () => {
    const result = getDrawingBounds([{ x: 10, y: 20 }], 6);

    expect(result).toEqual({ x: 10, y: 20, width: 6, height: 6 });
  });

  it('여러 점이면 최소/최대 좌표에 패딩을 더해 중심과 크기를 계산한다', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 4 },
    ];

    const result = getDrawingBounds(points, 2);

    expect(result).toEqual({ x: 5, y: 2, width: 12, height: 6 });
  });
});
