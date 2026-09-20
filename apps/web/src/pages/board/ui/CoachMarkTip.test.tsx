import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CameraState } from '../model/board-camera';

import { CoachMarkTip } from './CoachMarkTip';

const IDENTITY_CAMERA: CameraState = { x: 0, y: 0, scale: 1 };
const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 768;
const PILL_SIZE = { width: 300, height: 50 };
const ARROW_SIZE = { width: 16, height: 8 };

type Rect = { x: number; y: number; width: number; height: number };

const rectsByTestId = new Map<string, Rect>();

function mockRects() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const rect = rectsByTestId.get(this.dataset.testid ?? '') ?? {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
    return {
      ...rect,
      top: rect.y,
      left: rect.x,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
      toJSON: () => {},
    };
  });
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
}

describe('CoachMarkTip', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = document.createElement('div');
    document.body.appendChild(anchor);
  });

  afterEach(() => {
    cleanup();
    anchor.remove();
    vi.restoreAllMocks();
  });

  it('anchor가 없으면 아무것도 렌더링하지 않는다', () => {
    render(
      <CoachMarkTip
        anchorElement={null}
        message="안내 문구"
        onDismiss={vi.fn()}
        camera={IDENTITY_CAMERA}
      />,
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('anchor가 있으면 안내 문구를 보여준다', async () => {
    render(
      <CoachMarkTip
        anchorElement={anchor}
        message="그림을 꾹 눌러서 삭제할 수 있어요."
        onDismiss={vi.fn()}
        camera={IDENTITY_CAMERA}
      />,
    );

    const pill = await screen.findByRole('tooltip');
    expect(pill).toHaveTextContent('그림을 꾹 눌러서 삭제할 수 있어요.');
  });

  it('닫기 버튼을 누르면 onDismiss가 호출된다', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <CoachMarkTip
        anchorElement={anchor}
        message="안내 문구"
        onDismiss={onDismiss}
        camera={IDENTITY_CAMERA}
      />,
    );

    await screen.findByRole('tooltip');
    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pill 위에서 pointerdown하면 바깥으로 전파되지 않는다', async () => {
    const onOuterPointerDown = vi.fn();
    document.addEventListener('pointerdown', onOuterPointerDown);

    render(
      <CoachMarkTip
        anchorElement={anchor}
        message="안내 문구"
        onDismiss={vi.fn()}
        camera={IDENTITY_CAMERA}
      />,
    );

    const pill = await screen.findByRole('tooltip');
    fireEvent.pointerDown(pill, { pointerId: 1 });

    expect(onOuterPointerDown).not.toHaveBeenCalled();

    document.removeEventListener('pointerdown', onOuterPointerDown);
  });

  describe('보드 월드 좌표 배치', () => {
    let boardCanvas: HTMLDivElement;

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
      rectsByTestId.set('board-canvas', { x: 50, y: 30, width: 800, height: 600 });
      // anchor 중심 x = 400, 하단 y = 240 — 화면 clamp가 필요 없는 케이스
      rectsByTestId.set('anchor', { x: 350, y: 200, width: 100, height: 40 });
      rectsByTestId.set('coach-mark-pill', { x: 0, y: 0, ...PILL_SIZE });
      rectsByTestId.set('coach-mark-arrow', { x: 0, y: 0, ...ARROW_SIZE });
      mockRects();

      boardCanvas = document.createElement('div');
      boardCanvas.dataset.testid = 'board-canvas';
      boardCanvas.setAttribute('data-board-canvas', '');
      anchor.dataset.testid = 'anchor';
      boardCanvas.appendChild(anchor);
      document.body.appendChild(boardCanvas);
    });

    afterEach(() => {
      boardCanvas.remove();
    });

    it('anchor의 화면 위치를 그 시점의 카메라 기준 월드 좌표로 변환해 배치한다', async () => {
      // screen pill 위치 = (250, 268) [anchor center 400 - pill폭/2 150, anchor bottom 240 + gap 28]
      // container 오프셋 (50, 30)을 뺀 로컬 좌표 = (200, 238)
      // camera{x:20, y:10, scale:2} 기준 월드 좌표 = ((200-20)/2, (238-10)/2) = (90, 114)
      const camera: CameraState = { x: 20, y: 10, scale: 2 };

      render(
        <CoachMarkTip
          anchorElement={anchor}
          message="안내 문구"
          onDismiss={vi.fn()}
          camera={camera}
        />,
      );

      const pill = await screen.findByRole('tooltip');

      expect(pill.style.left).toBe('90px');
      expect(pill.style.top).toBe('114px');
    });

    it('최초 배치 이후 camera가 바뀌어도 위치를 다시 계산하지 않는다', async () => {
      const initialCamera: CameraState = { x: 20, y: 10, scale: 2 };

      const { rerender } = render(
        <CoachMarkTip
          anchorElement={anchor}
          message="안내 문구"
          onDismiss={vi.fn()}
          camera={initialCamera}
        />,
      );

      const pill = await screen.findByRole('tooltip');
      expect(pill.style.left).toBe('90px');

      rerender(
        <CoachMarkTip
          anchorElement={anchor}
          message="안내 문구"
          onDismiss={vi.fn()}
          camera={{ x: 500, y: 500, scale: 0.5 }}
        />,
      );

      expect(pill.style.left).toBe('90px');
      expect(pill.style.top).toBe('114px');
    });
  });
});
