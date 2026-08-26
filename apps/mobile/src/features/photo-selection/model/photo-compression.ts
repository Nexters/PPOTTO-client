import type { GalleryPhoto } from './gallery-photo';
import type { PhotoGroup } from './photo-group';

type CompressPhoto = (photo: GalleryPhoto) => Promise<GalleryPhoto>;
type CompressionProgress = (progress: {
  completed: number;
  total: number;
  photo: GalleryPhoto;
  result: GalleryPhoto;
}) => void;

const DEFAULT_CONCURRENCY = 3;

export function createPhotoCompressionQueue(
  compress: CompressPhoto,
  concurrency = DEFAULT_CONCURRENCY,
) {
  let currentRunId = 0;
  let current = Promise.resolve<ReadonlyMap<string, GalleryPhoto>>(new Map());

  const run = async (
    groups: PhotoGroup[],
    runId: number,
    runCompress: CompressPhoto,
    onProgress?: CompressionProgress,
  ) => {
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
            result = await runCompress(photo);
            break;
          } catch {
            result = photo;
          }
        }

        if (runId !== currentRunId) return;
        results.set(photo.id, result);
        onProgress?.({ completed: results.size, total: photos.length, photo, result });
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, photos.length) }, worker));
    return results;
  };

  return {
    start(
      groups: PhotoGroup[],
      runCompress: CompressPhoto = compress,
      onProgress?: CompressionProgress,
    ) {
      const runId = ++currentRunId;
      current = run(groups, runId, runCompress, onProgress);
    },
    wait: () => current,
  };
}
