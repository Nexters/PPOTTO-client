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
  const compress = jest
    .fn<Promise<GalleryPhoto>, [source: GalleryPhoto]>()
    .mockRejectedValueOnce(new Error('retry'))
    .mockResolvedValueOnce(compressed(retry))
    .mockRejectedValueOnce(new Error('fallback'))
    .mockRejectedValueOnce(new Error('fallback'))
    .mockResolvedValueOnce(compressed(next));
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

it('새 목록을 시작하면 진행 중이던 결과를 버리고 이전 큐의 다음 사진을 압축하지 않는다', async () => {
  let finishOldPhoto!: (result: GalleryPhoto) => void;
  const oldPhotoPending = new Promise<GalleryPhoto>((resolve) => {
    finishOldPhoto = resolve;
  });
  const compress = jest.fn((source: GalleryPhoto) =>
    source.id === 'old-a' ? oldPhotoPending : Promise.resolve(compressed(source)),
  );
  const queue = createPhotoCompressionQueue(compress);

  queue.start([group(photo('old-a'), photo('old-b'))]);
  queue.start([group(photo('new-a'), photo('new-b'))]);

  const latest = await queue.wait();
  finishOldPhoto(compressed(photo('old-a')));
  await oldPhotoPending;

  expect(new Set(compress.mock.calls.map(([source]) => source.id))).toEqual(
    new Set(['old-a', 'new-a', 'new-b']),
  );
  expect(compress).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'old-b' }));
  expect([...latest.keys()]).toEqual(['new-a', 'new-b']);
  expect([...(await queue.wait()).keys()]).toEqual(['new-a', 'new-b']);
});
