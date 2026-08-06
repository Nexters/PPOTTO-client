import { useMutation } from '@tanstack/react-query';

import { boardApi, type UpdateBoardLayoutInput } from './board-api';

type UpdateBoardLayoutVariables = {
  boardId: string;
  input: UpdateBoardLayoutInput;
};

export const useUpdateBoardLayoutMutation = () =>
  useMutation({
    mutationFn: ({ boardId, input }: UpdateBoardLayoutVariables) =>
      boardApi.updateLayout(boardId, input),
    retry: 2,
  });
