import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnchoredTipPosition } from './use-anchored-tip-position';

const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 768;
const VIEWPORT_PADDING_PX = 16;
const PILL_SIZE = { width: 300, height: 50 };
const ARROW_SIZE = { width: 16, height: 8 };
const NOT_POSITIONED_LEFT = '-9999px';

type Rect = { x: number; y: number; width: number; height: number };

const rectsByTestId = new Map<string, Rect>();

function setAnchorRect(rect: Rect) {
  rectsByTestId.set('anchor', rect);
}

function TestTip({
  anchor,
  arrowEdgePadding,
}: {
  anchor: Element | null;
  arrowEdgePadding?: number;
}) {
  const { pillRef, arrowRef, position } = useAnchoredTipPosition(anchor, arrowEdgePadding);
  return (
    <div
      ref={pillRef}
      data-testid="pill"
      style={{
        position: 'fixed',
        left: position ? position.x : NOT_POSITIONED_LEFT,
        top: position?.y,
      }}
    >
      <div
        ref={arrowRef}
        data-testid="arrow"
        style={{ position: 'absolute', left: position?.arrowX ?? undefined }}
      />
    </div>
  );
}

describe('useAnchoredTipPosition', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: VIEWPORT_WIDTH,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: VIEWPORT_HEIGHT,
      configurable: true,
    });

    rectsByTestId.clear();
    rectsByTestId.set('pill', { x: 0, y: 0, ...PILL_SIZE });
    rectsByTestId.set('arrow', { x: 0, y: 0, ...ARROW_SIZE });

    // pill/arrow는 렌더링 시점에만 DOM에 생겨서 인스턴스 단위로 스텁할 수 없다.
    // computePosition이 처음 호출되는 순간부터 이미 크기가 잡혀 있어야 하므로
    // 프로토타입 레벨에서 testid로 분기해 스텁한다.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const testId = this.dataset.testid ?? '';
      const rect = rectsByTestId.get(testId) ?? { x: 0, y: 0, width: 0, height: 0 };
      return {
        ...rect,
        top: rect.y,
        left: rect.x,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height,
        toJSON: () => {},
      };
    });
    // floating-ui는 floating/arrow 엘리먼트의 크기를 getBoundingClientRect가 아니라
    // offsetWidth/offsetHeight로 읽는데, jsdom은 레이아웃을 안 해서 항상 0을 반환한다.
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return rectsByTestId.get(this.dataset.testid ?? '')?.width ?? 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return rectsByTestId.get(this.dataset.testid ?? '')?.height ?? 0;
    });

    anchor = document.createElement('div');
    anchor.dataset.testid = 'anchor';
    document.body.appendChild(anchor);
  });

  afterEach(() => {
    cleanup();
    anchor.remove();
    vi.restoreAllMocks();
  });

  it('anchor 중앙 아래에 pill을 배치한다', async () => {
    // anchor 중심 x = 512 (뷰포트 정중앙), 화면 clamp가 필요 없는 케이스
    setAnchorRect({ x: 462, y: 300, width: 100, height: 40 });

    const { getByTestId } = render(<TestTip anchor={anchor} />);

    await waitFor(() => expect(getByTestId('pill').style.left).not.toBe(NOT_POSITIONED_LEFT));

    expect(getByTestId('pill').style.left).toBe('362px');
  });

  it('anchor가 화면 오른쪽 끝에 있으면 pill이 뷰포트 밖으로 나가지 않게 clamp된다', async () => {
    // anchor 중심 x = 1000, pill(폭 300)을 중앙 정렬하면 화면(1024) 밖으로 나감
    setAnchorRect({ x: 990, y: 300, width: 20, height: 20 });

    const { getByTestId } = render(<TestTip anchor={anchor} />);

    await waitFor(() => expect(getByTestId('pill').style.left).not.toBe(NOT_POSITIONED_LEFT));

    const pillLeft = parseFloat(getByTestId('pill').style.left);
    expect(pillLeft).toBeLessThanOrEqual(VIEWPORT_WIDTH - PILL_SIZE.width - VIEWPORT_PADDING_PX);
  });

  it('pill이 화면 밖으로 나가지 않게 clamp되어도 화살표는 anchor 중심을 계속 가리킨다', async () => {
    // anchor 중심 x = 1000 (위 clamp 케이스와 동일한 anchor)
    setAnchorRect({ x: 990, y: 300, width: 20, height: 20 });

    const { getByTestId } = render(<TestTip anchor={anchor} />);

    await waitFor(() => expect(getByTestId('pill').style.left).not.toBe(NOT_POSITIONED_LEFT));

    const pillLeft = parseFloat(getByTestId('pill').style.left);
    const arrowLeft = parseFloat(getByTestId('arrow').style.left);
    const arrowAbsoluteCenterX = pillLeft + arrowLeft + ARROW_SIZE.width / 2;

    expect(arrowAbsoluteCenterX).toBe(1000);
  });

  it('arrowEdgePadding을 주면 화살표가 pill 모서리(rounded corner) 근처까지 가지 않는다', async () => {
    // anchor 중심 x = 1000 — padding 없이는 화살표가 pill 우측 끝(284)까지 붙는 케이스(위 테스트)
    setAnchorRect({ x: 990, y: 300, width: 20, height: 20 });
    const edgePadding = 8;

    const { getByTestId } = render(<TestTip anchor={anchor} arrowEdgePadding={edgePadding} />);

    await waitFor(() => expect(getByTestId('pill').style.left).not.toBe(NOT_POSITIONED_LEFT));

    const arrowLeft = parseFloat(getByTestId('arrow').style.left);
    expect(arrowLeft).toBeLessThanOrEqual(PILL_SIZE.width - ARROW_SIZE.width - edgePadding);
  });

  it('anchor가 없으면 위치를 계산하지 않는다', () => {
    const { getByTestId } = render(<TestTip anchor={null} />);

    expect(getByTestId('pill').style.left).toBe(NOT_POSITIONED_LEFT);
  });
});
