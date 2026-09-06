import { QueryClient } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';

import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

import { toDrawingMoveInput, toTextCreateInput } from './board-drawing';
import { useDrawingPersistence } from './use-drawing-persistence';

it('선택만 하거나 같은 값 저장은 제외하고 텍스트/그림 편집 종류를 구분한다', () => {
  const queryClient = new QueryClient();
  const saveLayout = vi.fn();
  const drawing = toDrawingMoveInput('drawing-1', [{ x: 0, y: 0 }], {
    color: '#fff',
    strokeWidth: 2,
  });
  const textOptions = { text: 'private text', x: 0, y: 0, fontSize: 16, maxWidth: 100, zIndex: 0 };
  const text = toTextCreateInput('text-1', textOptions);
  queryClient.setQueryData(boardQueryKeys.detail('board-1'), { drawings: [drawing, text] });
  // 이 함수는 React 훅을 호출하지 않고 기존 mutation과 캐시를 조합한다.
  const persistence = useDrawingPersistence({ boardId: 'board-1', queryClient, saveLayout });
  persistence.moveDrawing(toTextCreateInput('text-1', { ...textOptions, zIndex: 2 }));
  expect(saveLayout.mock.lastCall?.[0].analytics).toEqual([]);
  persistence.moveDrawing(
    toDrawingMoveInput('drawing-1', [{ x: 0, y: 0 }], { color: '#fff', strokeWidth: 2, zIndex: 5 }),
  );
  expect(saveLayout.mock.lastCall?.[0].analytics).toEqual([]);
  persistence.moveDrawing(
    toTextCreateInput('text-1', { ...textOptions, text: 'edited private text' }),
  );
  expect(saveLayout.mock.lastCall?.[0].analytics).toEqual([
    ['board_text_edit_completed', { action: 'update' }],
  ]);
  persistence.moveDrawing(
    toDrawingMoveInput('drawing-1', [{ x: 2, y: 3 }], { color: '#fff', strokeWidth: 2 }),
  );
  expect(saveLayout.mock.lastCall?.[0].analytics).toEqual([
    ['board_drawing_edit_completed', { action: 'transform' }],
  ]);
  persistence.deleteDrawing('text-1');
  expect(saveLayout.mock.lastCall?.[0].analytics).toEqual([
    ['board_text_edit_completed', { action: 'delete' }],
  ]);
  queryClient.clear();
});
