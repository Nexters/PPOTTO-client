import { useMutation, useQueryClient } from '@tanstack/react-query';

import { boardApi, type UpdateBoardLayoutInput } from './board-api';
import { boardQueryKeys } from './board-query-keys';

type UpdateBoardLayoutVariables = {
  boardId: string;
  input: UpdateBoardLayoutInput;
};

export const useUpdateBoardLayoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, input }: UpdateBoardLayoutVariables) =>
      boardApi.updateLayout(boardId, input),
    retry: 2,
    // 낙관적으로 미리 반영한 캐시가 실패 후에도 오래 남아있지 않도록(staleTime 55분) 서버 상태로 되돌린다
    onError: (_error, variables) => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(variables.boardId) });
    },
  });
};
