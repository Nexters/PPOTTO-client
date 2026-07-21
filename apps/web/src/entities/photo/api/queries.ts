import { useQuery } from '@tanstack/react-query';

import { get } from './get';

export const photoKeys = {
  all: ['photos'] as const,
  list: () => [...photoKeys.all, 'list'] as const,
};

export function usePhotoList() {
  return useQuery({ queryKey: photoKeys.list(), queryFn: ({ signal }) => get.list({ signal }) });
}
