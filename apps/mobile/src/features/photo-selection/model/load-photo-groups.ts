import type { GalleryPhoto } from './gallery-photo';
import { groupPhotos, type PhotoGroup } from './photo-group';

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

interface LoadPhotoGroupsOptions {
  fetchPage: FetchPhotoPage;
  targetUnits: number;
}

/**
 * 갤러리를 최신부터 훑어 목표 그룹 수가 차면 멈추고, 갤러리가 끝나면 있는 만큼 반환한다.
 *
 * 페이지를 덧붙일 때마다 누적 전체를 다시 그룹화한다. 마지막 그룹은 다음 페이지의 오래된 사진이
 * 합쳐질 수 있어 확정이 아니기 때문이다. 재그룹화는 숫자 배열 순회라 비용이 없고, 비싼 것은
 * fetchPage(네이티브 왕복)뿐이라 호출 횟수만 줄이면 된다.
 */
export async function loadPhotoGroups({
  fetchPage,
  targetUnits,
}: LoadPhotoGroupsOptions): Promise<PhotoGroup[]> {
  const loaded: GalleryPhoto[] = [];
  let groups: PhotoGroup[] = [];
  let cursor: string | undefined;
  let page = 0;

  while (groups.length < targetUnits) {
    const size = PAGE_SIZES[Math.min(page, PAGE_SIZES.length - 1)]!;
    const result = await fetchPage({ first: size, after: cursor });

    loaded.push(...result.assets);
    groups = groupPhotos(loaded);

    if (!result.hasNextPage) break;

    cursor = result.endCursor;
    page += 1;
  }

  return groups.slice(0, targetUnits);
}
