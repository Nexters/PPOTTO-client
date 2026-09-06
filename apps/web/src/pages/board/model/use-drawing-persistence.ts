import type { QueryClient } from '@tanstack/react-query';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';

import type { DrawingCreateInput, ParsedDrawing } from './board-drawing';
import { parseStrokePoints, toDrawingMoveInput } from './board-drawing';

type UseDrawingPersistenceParams = {
  boardId: string;
  queryClient: QueryClient;
  saveLayout: ReturnType<typeof useUpdateBoardLayoutMutation>['mutate'];
};

// 그림을 캐시에 낙관적으로 반영하고 저장 요청을 보내는 것만 담당한다. 언제 호출할지(선택,
// 드래그 커밋, draw 모드 종료 등)는 호출자(BoardCanvas)의 책임이다.
export function useDrawingPersistence({
  boardId,
  queryClient,
  saveLayout,
}: UseDrawingPersistenceParams) {
  // 그림을 캐시에서 낙관적으로 제거하고 삭제 요청을 보냄
  const deleteDrawing = (id: string) => {
    const drawing = queryClient
      .getQueryData<BoardDetail>(boardQueryKeys.detail(boardId))
      ?.drawings.find((item) => item.id === id);
    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current ? { ...current, drawings: current.drawings.filter((d) => d.id !== id) } : current,
    );

    saveLayout({
      boardId,
      input: { drawings: { deletedIds: [id] } },
      analytics: drawing
        ? [
            [
              'content' in drawing ? 'board_text_edit_completed' : 'board_drawing_edit_completed',
              { action: 'delete' },
            ],
          ]
        : [],
    });
  };

  // 새 그림을 캐시에 낙관적으로 추가하고 저장 요청을 보냄
  const createDrawing = (input: DrawingCreateInput) => {
    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current ? { ...current, drawings: [...current.drawings, input] } : current,
    );

    saveLayout({
      boardId,
      input: { drawings: { created: [input] } },
      analytics: [
        [
          'content' in input ? 'board_text_edit_completed' : 'board_drawing_edit_completed',
          { action: 'create' },
        ],
      ],
    });
  };

  // 그림을 새 위치로 캐시에 낙관적으로 반영하고 저장 요청을 보냄
  const moveDrawing = (input: DrawingCreateInput) => {
    const previous = queryClient
      .getQueryData<BoardDetail>(boardQueryKeys.detail(boardId))
      ?.drawings.find((item) => item.id === input.id);
    const changed =
      previous &&
      ('content' in input
        ? ['content', 'posX', 'posY', 'fontSize', 'maxWidth', 'rotation', 'color'].some(
            (key) => Reflect.get(previous, key) !== Reflect.get(input, key),
          )
        : previous.color !== input.color ||
          Reflect.get(previous, 'strokeWidth') !== input.strokeWidth ||
          JSON.stringify(parseStrokePoints(Reflect.get(previous, 'stroke'))) !==
            JSON.stringify(parseStrokePoints(input.stroke)));
    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current
        ? { ...current, drawings: current.drawings.map((d) => (d.id === input.id ? input : d)) }
        : current,
    );

    saveLayout({
      boardId,
      input: { drawings: { created: [input] } },
      analytics: changed
        ? [
            'content' in input
              ? [
                  'board_text_edit_completed',
                  {
                    action:
                      previous && 'content' in previous && previous.content !== input.content
                        ? 'update'
                        : 'transform',
                  },
                ]
              : ['board_drawing_edit_completed', { action: 'transform' }],
          ]
        : [],
    });
  };

  // draw 모드 세션에서 그린 draft 여러 개를 한 번에 캐시에 낙관적으로 반영하고 저장 요청을 보냄.
  const confirmDraftDrawings = (drafts: ParsedDrawing[]) => {
    const inputs = drafts.map((drawing) =>
      toDrawingMoveInput(drawing.id, drawing.points, {
        color: drawing.color,
        strokeWidth: drawing.strokeWidth,
        zIndex: drawing.zIndex,
      }),
    );

    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current ? { ...current, drawings: [...current.drawings, ...inputs] } : current,
    );

    saveLayout({
      boardId,
      input: { drawings: { created: inputs } },
      analytics: inputs.map(() => ['board_drawing_edit_completed', { action: 'create' }]),
    });
  };

  return { createDrawing, deleteDrawing, moveDrawing, confirmDraftDrawings };
}
