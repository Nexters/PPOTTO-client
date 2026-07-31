import type { GalleryPhoto } from './gallery-photo';
import { type FetchPhotoPage, loadPhotoGroups } from './load-photo-groups';

/**
 * 동작 범위 (2026-07-30)
 *
 * 갤러리를 최신부터 훑어 목표 그룹 수가 차면 멈추는 로딩 로직. fetchPage를 주입받으므로
 * expo-media-library 없이 검증한다.
 *
 * 페이지를 덧붙일 때마다 누적 전체를 다시 그룹화한다. 최신 앵커라 이미 만든(더 최신) 그룹은
 * 바뀌지 않지만, 마지막 그룹은 다음 페이지의 오래된 사진이 합쳐질 수 있어 아직 확정이 아니다.
 * 재그룹화는 숫자 배열 순회라 비용이 없다.
 *
 * 알려진 한계: 조기 중단 때문에 마지막 그룹은 전체 스캔보다 사진이 적을 수 있다. 목표를 채운
 * 시점에 멈추는 설계의 대가이며, 100번째 타일이 보여주는 사진이 달라질 수 있다.
 */

const BASE_TIME = Date.parse('2026-07-30T10:00:00.000Z');

const minutes = (n: number) => n * 60_000;
const seconds = (n: number) => n * 1_000;

/** 서로 10분 떨어져 각각 1그룹이 되는 사진. 배열 앞쪽이 최신이다. */
function spacedPhotos(count: number): GalleryPhoto[] {
  return Array.from({ length: count }, (_, i) => photo(`p${i}`, BASE_TIME - i * minutes(10)));
}

/** 10장이 한 그룹이 되도록 묶인 사진. count / 10 개의 그룹이 나온다. */
function burstPhotos(count: number): GalleryPhoto[] {
  return Array.from({ length: count }, (_, i) => {
    const group = Math.floor(i / 10);
    return photo(`p${i}`, BASE_TIME - group * minutes(10) - (i % 10) * seconds(10));
  });
}

function photo(id: string, creationTime: number): GalleryPhoto {
  return { id, uri: `file:///${id}.jpg`, creationTime, width: 100, height: 100 };
}

/**
 * 커서를 인덱스로 쓰는 가짜 갤러리. 요청 내역을 남겨 호출 크기와 커서를 확인한다.
 *
 * 호출 횟수에 상한을 둔다. 종료 조건이 깨지면 루프가 즉시 해소되는 Promise만 돌려서
 * Jest 타임아웃 타이머까지 굶겨 테스트가 실패가 아니라 멈춤이 된다. 상한이 그걸 실패로 바꾼다.
 */
function galleryOf(photos: GalleryPhoto[], maxCalls = 10) {
  const calls: { first: number; after?: string }[] = [];

  const fetchPage: FetchPhotoPage = async ({ first, after }) => {
    calls.push({ first, after });
    if (calls.length > maxCalls) {
      throw new Error(`fetchPage가 ${maxCalls}회를 넘겨 호출됐다 — 종료 조건이 깨졌다`);
    }

    const start = after ? Number(after) : 0;
    const assets = photos.slice(start, start + first);
    const end = start + assets.length;

    return { assets, endCursor: String(end), hasNextPage: end < photos.length };
  };

  return { fetchPage, calls };
}

it('첫 페이지로 목표를 채우면 추가 요청하지 않는다', async () => {
  const { fetchPage, calls } = galleryOf(spacedPhotos(500));

  await loadPhotoGroups({ fetchPage, targetUnits: 100 });

  expect(calls).toHaveLength(1);
});

it('목표를 넘겨 그룹이 만들어져도 최신 그룹부터 목표 개수만 반환한다', async () => {
  const { fetchPage } = galleryOf(spacedPhotos(500));

  const groups = await loadPhotoGroups({ fetchPage, targetUnits: 100 });

  expect(groups).toHaveLength(100);
  expect(groups[0]!.photos[0]!.id).toBe('p0');
  expect(groups[99]!.photos[0]!.id).toBe('p99');
});

it('목표에 못 미치면 커서와 함께 다음 페이지를 요청한다', async () => {
  // 10장이 한 그룹이라 300장으로는 30그룹뿐이다.
  const { fetchPage, calls } = galleryOf(burstPhotos(1500));

  await loadPhotoGroups({ fetchPage, targetUnits: 100 });

  expect(calls[0]).toEqual({ first: 300, after: undefined });
  expect(calls[1]).toEqual({ first: 500, after: '300' });
});

it('페이지를 거듭할수록 요청 크기를 키운다', async () => {
  const { fetchPage, calls } = galleryOf(burstPhotos(1500));

  await loadPhotoGroups({ fetchPage, targetUnits: 100 });

  expect(calls.map((call) => call.first)).toEqual([300, 500, 1000]);
});

it('갤러리가 끝나면 목표에 못 미쳐도 멈추고 있는 만큼 반환한다', async () => {
  const { fetchPage, calls } = galleryOf(spacedPhotos(40));

  const groups = await loadPhotoGroups({ fetchPage, targetUnits: 100 });

  expect(groups).toHaveLength(40);
  expect(calls).toHaveLength(1);
});
