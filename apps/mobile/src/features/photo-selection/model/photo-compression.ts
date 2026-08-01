import type { GalleryPhoto } from './gallery-photo';
import type { PhotoGroup } from './photo-group';

type CompressPhoto = (photo: GalleryPhoto) => Promise<GalleryPhoto>;

const CONCURRENCY = 5;

export function createPhotoCompressionQueue(compress: CompressPhoto) {
  let currentRunId = 0;
  let current = Promise.resolve<ReadonlyMap<string, GalleryPhoto>>(new Map());

  const run = async (groups: PhotoGroup[], runId: number) => {
    const photos = groups.flatMap((group) => group.photos);
    const results = new Map<string, GalleryPhoto>();
    let nextIndex = 0;

    const worker = async () => {
      while (runId === currentRunId) {
        const photo = photos[nextIndex++];
        if (!photo) return;

        let result = photo;
        for (let attempt = 0; attempt < 2 && runId === currentRunId; attempt += 1) {
          try {
            result = await compress(photo);
            break;
          } catch {
            result = photo;
          }
        }

        if (runId !== currentRunId) return;
        results.set(photo.id, result);
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, photos.length) }, worker));
    return results;
  };

  return {
    start(groups: PhotoGroup[]) {
      const runId = ++currentRunId;
      current = run(groups, runId);
    },
    wait: () => current,
  };
}
