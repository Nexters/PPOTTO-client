import { Platform } from 'react-native';

import {
  clearCompressedPhotos,
  compressPhoto,
  type CompressPhotoOptions,
} from '../lib/compress-photo';

import { createPhotoCompressionQueue } from './photo-compression';
import type { PhotoGroup } from './photo-group';

// iOS는 iCloud 다운로드(IO 바운드)가 섞여 병렬을 더 준다
const queue = createPhotoCompressionQueue(compressPhoto, Platform.OS === 'ios' ? 6 : 3);
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
    queue.start(
      groups,
      async (photo) => {
        let slowTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          return await compressPhoto(photo, options, (stage) => {
            if (slowTimer) clearTimeout(slowTimer);
            slowTimer = setTimeout(
              () => log(`[photo-compression:${id}] 지연 (${photo.id}, ${stage}, 15초+)`),
              15_000,
            );
          });
        } finally {
          if (slowTimer) clearTimeout(slowTimer);
        }
      },
      ({ completed, total, photo, result }) => {
        if (result === photo) log(`[photo-compression:${id}] 원본 폴백 (${photo.id})`);
        if (completed % 10 === 0) {
          const seconds = ((Date.now() - startedAt) / 1000).toFixed(2);
          log(`[photo-compression:${id}] 진행 (${completed}/${total}, ${seconds}초)`);
        }
      },
    );
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
