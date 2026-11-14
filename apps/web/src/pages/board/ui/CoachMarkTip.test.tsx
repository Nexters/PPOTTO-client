import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    rectsByTestId.set('anchor', { x: 350, y: 200, width: 100, height: 40 });
    rectsByTestId.set('coach-mark-pill', { x: 0, y: 0, ...PILL_SIZE });
    rectsByTestId.set('coach-mark-arrow', { x: 0, y: 0, ...ARROW_SIZE });
    mockRects();

    boardCanvas = document.createElement('div');
    boardCanvas.dataset.testid = 'board-canvas';
    boardCanvas.setAttribute('data-board-canvas', '');
    boardCanvas.style.position = 'relative';
    Object.defineProperty(boardCanvas, 'clientWidth', {
      get: () => rectsByTestId.get('board-canvas')?.width ?? 0,
    });
    Object.defineProperty(boardCanvas, 'clientHeight', {
      get: () => rectsByTestId.get('board-canvas')?.height ?? 0,
    });
    anchor = document.createElement('div');
    anchor.dataset.testid = 'anchor';
    boardCanvas.appendChild(anchor);
    document.body.appendChild(boardCanvas);
    vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.dataset.testid === 'coach-mark-pill' ? boardCanvas : null;
    });
  });

  afterEach(() => {
    boardCanvas.remove();
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

  describe('대상의 화면 위치 추적', () => {
    it('화면에서 보이는 대상 아래에 말풍선을 배치한다', async () => {
      render(
        <CoachMarkTip
          anchorElement={anchor}
          message="안내 문구"
          onDismiss={vi.fn()}
          camera={IDENTITY_CAMERA}
        />,
      );

      const pill = await screen.findByRole('tooltip');
      expect(pill.style.left).toBe('200px');
      expect(pill.style.top).toBe('238px');
      expect(pill.style.transform).toBe('');
    });

    it('대상이 화면 밖으로 이동해도 말풍선은 대상 위치를 따라가며 보드 경계에서 잘린다', async () => {
      rectsByTestId.set('board-canvas', { x: 50, y: 30, width: 350, height: 600 });
      rectsByTestId.set('anchor', { x: 410, y: 200, width: 20, height: 40 });
      boardCanvas.style.overflow = 'hidden';

      render(
        <CoachMarkTip
          anchorElement={anchor}
          message="안내 문구"
          onDismiss={vi.fn()}
          camera={IDENTITY_CAMERA}
        />,
      );

      const pill = await screen.findByRole('tooltip');
      expect(pill.parentElement).toBe(boardCanvas);
      expect(pill.style.visibility).toBe('visible');
      expect(pill.style.left).toBe('220px');
      expect(parseFloat(pill.style.left) + PILL_SIZE.width).toBeGreaterThan(350);
    });

    it('줌이나 이동으로 대상의 화면 위치가 바뀌면 말풍선과 화살표가 함께 따라간다', async () => {
      const { rerender } = render(
        <CoachMarkTip
          anchorElement={anchor}
          message="안내 문구"
          onDismiss={vi.fn()}
          camera={IDENTITY_CAMERA}
        />,
      );

      const pill = await screen.findByRole('tooltip');
      expect(pill.style.left).toBe('200px');

      rectsByTestId.set('anchor', { x: 550, y: 300, width: 100, height: 80 });
      rerender(
        <CoachMarkTip
          anchorElement={anchor}
          message="안내 문구"
          onDismiss={vi.fn()}
          camera={{ x: 200, y: 100, scale: 2 }}
        />,
      );

      await waitFor(() => {
        expect(pill.style.left).toBe('400px');
        expect(pill.style.top).toBe('378px');
      });

      const arrow = screen.getByTestId('coach-mark-arrow');
      const arrowX = parseFloat(
        arrow.style.transform.match(/translateX\(([-\d.]+)px\)/)?.[1] ?? 'NaN',
      );
      expect(parseFloat(pill.style.left) + arrowX + ARROW_SIZE.width / 2).toBe(550);
    });
  });
});
