import type { GalleryPhoto } from './gallery-photo';
import type { PhotoGroup } from './photo-group';
import { createUploadPhotoCompressionQueue } from './upload-compression-queue';

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

it('photoId별 압축 결과를 캐싱해 같은 사진을 다시 압축하지 않는다', async () => {
  const source = photo('a');
  const compress = jest.fn(async (photo: GalleryPhoto) => compressed(photo));
  const queue = createUploadPhotoCompressionQueue(compress, {
    backgroundConcurrency: 1,
    submitConcurrency: 2,
  });

  queue.sync([group(source)]);
  await queue.wait([group(source)]);
  await queue.wait([group(source)]);

  expect(compress).toHaveBeenCalledTimes(1);
});

it('선택 변경 시 새 photoId만 추가로 압축한다', async () => {
  const first = photo('first');
  const second = photo('second');
  const compress = jest.fn(async (photo: GalleryPhoto) => compressed(photo));
  const queue = createUploadPhotoCompressionQueue(compress, {
    backgroundConcurrency: 1,
    submitConcurrency: 2,
  });

  queue.sync([group(first)]);
  await queue.wait([group(first)]);
  await queue.wait([group(first, second)]);

  expect(compress.mock.calls.map(([source]) => source.id)).toEqual(['first', 'second']);
});

it('wait은 내부에서 최종 선택 목록을 sync한 뒤 해당 photoId 결과만 반환한다', async () => {
  const compress = jest.fn(async (photo: GalleryPhoto) => compressed(photo));
  const queue = createUploadPhotoCompressionQueue(compress, {
    backgroundConcurrency: 1,
    submitConcurrency: 2,
  });

  queue.sync([group(photo('old'))]);
  const result = await queue.wait([group(photo('new'))]);

  expect([...result.keys()]).toEqual(['new']);
  expect(result.get('new')?.uri).toBe('file:///compressed/new.jpg');
});

it('압축이 실패하면 한 번 재시도하고 계속 실패한 사진은 원본으로 폴백한다', async () => {
  const retry = photo('retry');
  const fallback = photo('fallback');
  const attempts = new Map<string, number>();
  const compress = jest.fn(async (source: GalleryPhoto) => {
    const attempt = (attempts.get(source.id) ?? 0) + 1;
    attempts.set(source.id, attempt);
    if (source.id === 'retry' && attempt === 1) throw new Error('retry');
    if (source.id === 'fallback') throw new Error('fallback');
    return compressed(source);
  });
  const queue = createUploadPhotoCompressionQueue(compress, {
    backgroundConcurrency: 1,
    submitConcurrency: 2,
  });

  const result = await queue.wait([group(retry, fallback)]);

  const calledIds = compress.mock.calls.map(([source]) => source.id);
  expect(calledIds.filter((id) => id === 'retry')).toHaveLength(2);
  expect(calledIds.filter((id) => id === 'fallback')).toHaveLength(2);
  expect(result.get('retry')).toEqual(compressed(retry));
  expect(result.get('fallback')).toEqual(fallback);
});

it('제출 시 동시성을 승격해 대기 중인 압축을 병렬로 처리한다', async () => {
  const resolvers = new Map<string, (photo: GalleryPhoto) => void>();
  const compress = jest.fn(
    (source: GalleryPhoto) =>
      new Promise<GalleryPhoto>((resolve) => {
        resolvers.set(source.id, resolve);
      }),
  );
  const photos = [photo('a'), photo('b'), photo('c')];
  const queue = createUploadPhotoCompressionQueue(compress, {
    backgroundConcurrency: 1,
    submitConcurrency: 3,
  });

  queue.sync([group(...photos)]);
  expect(compress.mock.calls.map(([source]) => source.id)).toEqual(['a']);

  const waiting = queue.wait([group(...photos)]);
  await Promise.resolve();
  expect(new Set(compress.mock.calls.map(([source]) => source.id))).toEqual(
    new Set(['a', 'b', 'c']),
  );

  for (const source of photos) {
    resolvers.get(source.id)!(compressed(source));
  }
  await expect(waiting).resolves.toEqual(
    new Map(photos.map((source) => [source.id, compressed(source)])),
  );
});

it('clear는 대기 중인 작업과 캐시를 비우고 background 동시성으로 되돌린다', async () => {
  const resolvers = new Map<string, (photo: GalleryPhoto) => void>();
  const compress = jest.fn(
    (source: GalleryPhoto) =>
      new Promise<GalleryPhoto>((resolve) => {
        resolvers.set(source.id, resolve);
      }),
  );
  const queue = createUploadPhotoCompressionQueue(compress, {
    backgroundConcurrency: 1,
    submitConcurrency: 3,
  });

  queue.sync([group(photo('a'), photo('b'), photo('c'))]);
  const waiting = queue.wait([group(photo('a'), photo('b'), photo('c'))]);
  await Promise.resolve();
  expect(compress).toHaveBeenCalledTimes(3);

  queue.clear();
  for (const [id, resolve] of resolvers) {
    resolve(compressed(photo(id)));
  }
  await waiting;

  queue.sync([group(photo('d'), photo('e'))]);
  expect(compress.mock.calls.map(([source]) => source.id)).toEqual(['a', 'b', 'c', 'd']);
});
