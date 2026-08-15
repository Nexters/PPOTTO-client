import type { GalleryPhoto } from './gallery-photo';

/**
 * 페이지마다 커지는 요청 크기. 한 번 부족했다는 건 연사가 많은 사용자라는 신호이므로
 * 다음 배치를 키워 호출 횟수를 줄인다. 목록을 다 쓰면 마지막 크기를 계속 쓴다.
 */
export const PAGE_SIZES = [300, 500, 1000, 2000, 5000] as const;

export interface PhotoPage {
  assets: GalleryPhoto[];
  endCursor: string;
  hasNextPage: boolean;
}

export type FetchPhotoPage = (options: { first: number; after?: string }) => Promise<PhotoPage>;
