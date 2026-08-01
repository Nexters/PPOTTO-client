import type { GalleryPhoto } from './gallery-photo';
import { createPhotoCompressionQueue } from './photo-compression';
import type { PhotoGroup } from './photo-group';

function photo(id: string): GalleryPhoto {
  return {
    id,
    uri: `file:///${id}.jpg`,
    creationTime: 0,
    width: 100,
    height: 100,
  };
}

function group(...photos: GalleryPhoto[]): PhotoGroup {
  return { id: photos[0]!.id, photos };
}

const compressed = (source: GalleryPhoto): GalleryPhoto => ({
  ...source,
  uri: `file:///compressed/${source.id}.jpg`,
});

it('로드된 모든 그룹 사진을 압축해 사진 ID로 보관한다', async () => {
  const compress = jest.fn(async (source: GalleryPhoto) => compressed(source));
  const queue = createPhotoCompressionQueue(compress);

  queue.start([group(photo('a'), photo('b')), group(photo('c'))]);

  const result = await queue.wait();
  expect(new Set(compress.mock.calls.map(([source]) => source.id))).toEqual(
    new Set(['a', 'b', 'c']),
  );
  expect(Object.fromEntries([...result].map(([id, result]) => [id, result.uri]))).toEqual({
    a: 'file:///compressed/a.jpg',
    b: 'file:///compressed/b.jpg',
    c: 'file:///compressed/c.jpg',
  });
});

it('압축은 한 번 재시도하고 또 실패하면 원본을 보관한 뒤 다음 사진을 계속한다', async () => {
  const retry = photo('retry');
  const fallback = photo('fallback');
  const next = photo('next');
  const attempts = new Map<string, number>();
  const compress = jest.fn(async (source: GalleryPhoto) => {
    const attempt = (attempts.get(source.id) ?? 0) + 1;
    attempts.set(source.id, attempt);
    if (source.id === 'retry' && attempt === 1) throw new Error('retry');
    if (source.id === 'fallback') throw new Error('fallback');
    return compressed(source);
  });
  const queue = createPhotoCompressionQueue(compress);

  queue.start([group(retry, fallback, next)]);

  const result = await queue.wait();
  const calledIds = compress.mock.calls.map(([source]) => source.id);
  expect(calledIds.filter((id) => id === 'retry')).toHaveLength(2);
  expect(calledIds.filter((id) => id === 'fallback')).toHaveLength(2);
  expect(calledIds.filter((id) => id === 'next')).toHaveLength(1);
  expect(result.get('retry')).toEqual(compressed(retry));
  expect(result.get('fallback')).toEqual(fallback);
  expect(result.get('next')).toEqual(compressed(next));
});

it('다섯 장씩 압축하고 새 목록이 시작되면 대기 중인 이전 사진은 시작하지 않는다', async () => {
  const finishOldPhotos = new Map<string, (result: GalleryPhoto) => void>();
  const oldPhotos = Array.from({ length: 6 }, (_, index) => photo(`old-${index}`));
  const compress = jest.fn((source: GalleryPhoto) => {
    if (!source.id.startsWith('old-')) return Promise.resolve(compressed(source));

    return new Promise<GalleryPhoto>((resolve) => {
      finishOldPhotos.set(source.id, resolve);
    });
  });
  const queue = createPhotoCompressionQueue(compress);

  queue.start([group(...oldPhotos)]);
  queue.start([group(photo('new-a'), photo('new-b'))]);

  const latest = await queue.wait();
  oldPhotos
    .slice(0, 5)
    .forEach((oldPhoto) => finishOldPhotos.get(oldPhoto.id)!(compressed(oldPhoto)));
  await Promise.resolve();

  expect(new Set(compress.mock.calls.map(([source]) => source.id))).toEqual(
    new Set([...oldPhotos.slice(0, 5).map(({ id }) => id), 'new-a', 'new-b']),
  );
  expect(compress).not.toHaveBeenCalledWith(expect.objectContaining({ id: oldPhotos[5]!.id }));
  expect(new Set(latest.keys())).toEqual(new Set(['new-a', 'new-b']));
  expect(new Set((await queue.wait()).keys())).toEqual(new Set(['new-a', 'new-b']));
});
