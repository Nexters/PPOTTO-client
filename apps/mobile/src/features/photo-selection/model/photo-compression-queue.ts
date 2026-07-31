import { compressPhoto, type CompressionSizes, getCompressionSizes } from '../lib/compress-photo';

import { createPhotoCompressionQueue } from './photo-compression';
import type { PhotoGroup } from './photo-group';

const queue = createPhotoCompressionQueue(compressPhoto);
let runId = 0;

const megabytes = (bytes: number) => `${(bytes / 1024 ** 2).toFixed(1)}MB`;

const sizeSummary = (sizes: CompressionSizes[]) => {
  const originalBytes = sizes.reduce((total, size) => total + size.originalBytes, 0);
  const outputBytes = sizes.reduce((total, size) => total + size.outputBytes, 0);
  const difference = ((originalBytes - outputBytes) / originalBytes) * 100;
  const change = difference >= 0 ? '감소' : '증가';

  return `${megabytes(originalBytes)} → ${megabytes(outputBytes)}, ${Math.abs(difference).toFixed(1)}% ${change}`;
};

const log = (message: string) => {
  if (__DEV__ && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.log(message);
  }
};

export const photoCompressionQueue = {
  start(groups: PhotoGroup[]) {
    const id = ++runId;
    const photoCount = groups.reduce((count, group) => count + group.photos.length, 0);
    const startedAt = Date.now();
    log(`[photo-compression:${id}] 시작 (${photoCount}장)`);

    queue.start(groups);
    const current = queue.wait();
    void current.then((results) => {
      if (queue.wait() === current) {
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(2);
        const sizes = [...results.values()]
          .map(getCompressionSizes)
          .filter((size): size is CompressionSizes => size !== undefined);
        const sizesText = sizes.length === photoCount ? `, ${sizeSummary(sizes)}` : '';
        log(`[photo-compression:${id}] 완료 (${photoCount}장, ${seconds}초${sizesText})`);
      }
    });
  },
  wait: queue.wait,
};
