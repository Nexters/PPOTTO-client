import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ShareBoardContent } from '@/pages/board/model/board-share-layout';
import type { StickerData } from '@/pages/board/ui/Sticker';

import { SharedBoardCanvas, type SharedBoardCanvasHandle } from './SharedBoardCanvas';

// jsdom에는 PointerEvent가 없어 좌표가 빠진 이벤트가 만들어진다. 좌표와 pointerId만 담는 대체로 둔다
class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}
vi.stubGlobal('PointerEvent', TestPointerEvent);

// jsdom에서는 스티커 이미지가 그려지지 않으므로, 카메라와 누를 대상만 남긴 대체로 그린다
vi.mock('@/pages/board/ui/ShareBoardScene', () => ({
  ShareBoardScene: ({ camera }: { camera: { x: number; y: number; scale: number } }) => (
    <div style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}>
      <div data-sticker-id="sticker-1" />
    </div>
  ),
}));

const sticker = {
  id: 'sticker-1',
  title: '언제까지 일해요',
  isNew: false,
  type: 'TEXT',
  textContent: 'whats in my mac',
  posX: 0,
  posY: 0,
  scale: 1,
  rotation: 0,
  zIndex: 1,
  badgeOffsetX: 0,
  badgeOffsetY: 0,
} as StickerData;

const content: ShareBoardContent = { stickers: [sticker], drawings: [], texts: [] };

function renderCanvas() {
  const onStickerTap = vi.fn();
  const ref = createRef<SharedBoardCanvasHandle>();
  render(
    <SharedBoardCanvas
      ref={ref}
      content={content}
      initialCamera={{ scale: 1, x: 0, y: 0 }}
      onStickerTap={onStickerTap}
    />,
  );
  const canvas = screen.getByTestId('shared-board-canvas');
  const sceneTransform = () => (canvas.lastElementChild as HTMLElement).style.transform;
  return { canvas, onStickerTap, ref, sceneTransform };
}

describe('SharedBoardCanvas', () => {
  it('끌면 보드가 따라 움직인다', () => {
    const { canvas, sceneTransform } = renderCanvas();

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 40, clientY: 30 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 40, clientY: 30 });

    expect(sceneTransform()).toBe('translate(30px, 20px) scale(1)');
  });

  it('두 손가락을 벌리면 확대된다', () => {
    const { canvas, sceneTransform } = renderCanvas();

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(canvas, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 300, clientY: 100 });

    expect(sceneTransform()).toContain('scale(2)');
  });

  it('스티커를 탭하면 그 스티커를 고른다', () => {
    const { canvas, onStickerTap } = renderCanvas();
    const target = canvas.querySelector('[data-sticker-id="sticker-1"]')!;

    fireEvent.pointerDown(target, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(target, { pointerId: 1, clientX: 10, clientY: 10 });

    expect(onStickerTap).toHaveBeenCalledWith('sticker-1');
  });

  it('스티커에서 시작해도 끌었으면 고르지 않는다', () => {
    const { canvas, onStickerTap } = renderCanvas();
    const target = canvas.querySelector('[data-sticker-id="sticker-1"]')!;

    fireEvent.pointerDown(target, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 60, clientY: 10 });
    fireEvent.pointerUp(target, { pointerId: 1, clientX: 60, clientY: 10 });

    expect(onStickerTap).not.toHaveBeenCalled();
  });

  it('빈 곳을 두 번 탭하면 누른 지점을 기준으로 1배로 돌아간다', () => {
    const { canvas, sceneTransform } = renderCanvas();
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(canvas, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(canvas, { pointerId: 2 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    for (let i = 0; i < 2; i += 1) {
      fireEvent.pointerDown(canvas, { pointerId: 3, clientX: 50, clientY: 50 });
      fireEvent.pointerUp(canvas, { pointerId: 3, clientX: 50, clientY: 50 });
    }

    expect(sceneTransform()).toContain('scale(1)');
  });

  it('처음 위치로 돌아가기를 부르면 처음 카메라로 돌아간다', async () => {
    const { canvas, ref, sceneTransform } = renderCanvas();
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 110, clientY: 10 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    ref.current!.recenter();

    await waitFor(() => expect(sceneTransform()).toBe('translate(0px, 0px) scale(1)'));
  });
});
