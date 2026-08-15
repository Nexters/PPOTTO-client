import {
  clearCompressedPhotos,
  compressPhoto,
  type CompressPhotoOptions,
} from '../lib/compress-photo';

import { createPhotoCompressionQueue } from './photo-compression';
import type { PhotoGroup } from './photo-group';

const queue = createPhotoCompressionQueue(compressPhoto);
let runId = 0;

const log = (message: string) => {
  if (__DEV__ && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.log(message);
  }
};

export const photoCompressionQueue = {
  start(groups: PhotoGroup[], options?: CompressPhotoOptions) {
    const id = ++runId;
    const photoCount = groups.reduce((count, group) => count + group.photos.length, 0);
    const startedAt = Date.now();
    log(`[photo-compression:${id}] 시작 (${photoCount}장)`);

    clearCompressedPhotos();
    queue.start(groups, (photo) => compressPhoto(photo, options));
    const current = queue.wait();
    void current.then(() => {
      if (queue.wait() === current) {
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(2);
        log(`[photo-compression:${id}] 완료 (${photoCount}장, ${seconds}초)`);
      }
    });
  },
  wait: queue.wait,
};
