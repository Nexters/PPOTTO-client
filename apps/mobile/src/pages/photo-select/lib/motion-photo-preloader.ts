import { File } from 'expo-file-system';

import { compressPhoto, type GalleryPhoto } from '@/features/photo-selection';
import type { UploadMotionPhoto } from '@/features/photo-upload';

const BACKGROUND_CONCURRENCY = 2;
const SUBMIT_CONCURRENCY = 5;

type PreparedPhoto = UploadMotionPhoto | undefined;
type Task = {
  photo: GalleryPhoto;
  promise: Promise<PreparedPhoto>;
  resolve: (photo: PreparedPhoto) => void;
  status: 'queued' | 'running' | 'settled';
};

async function prepareMotionPhoto(photo: GalleryPhoto): Promise<UploadMotionPhoto> {
  const compressed = await compressPhoto(photo, { maxDimension: 768, quality: 0.6 });
  const base64 = await new File(compressed.uri).base64();

  return {
    ...compressed,
    contentType: 'image/jpeg',
    uri: `data:image/jpeg;base64,${base64}`,
  };
}

/** 선택 화면에 머무는 동안 로딩 모션 사진만 최대 동시 2장씩 준비한다. */
export function createMotionPhotoPreloader() {
  let active = 0;
  let concurrency = BACKGROUND_CONCURRENCY;
  let wanted = new Map<string, GalleryPhoto>();
  const tasks = new Map<string, Task>();

  const createTask = (photo: GalleryPhoto) => {
    let resolve!: (prepared: PreparedPhoto) => void;
    const task: Task = {
      photo,
      promise: new Promise((done) => {
        resolve = done;
      }),
      resolve: (prepared) => resolve(prepared),
      status: 'queued',
    };
    tasks.set(photo.id, task);
    return task;
  };

  const pump = () => {
    while (active < concurrency) {
      const task = [...tasks.values()].find(
        (candidate) => candidate.status === 'queued' && wanted.has(candidate.photo.id),
      );
      if (!task) return;

      task.status = 'running';
      active += 1;
      void (async () => {
        let prepared: PreparedPhoto;
        for (let attempt = 0; attempt < 2 && !prepared; attempt += 1) {
          try {
            prepared = await prepareMotionPhoto(task.photo);
          } catch {
            prepared = undefined;
          }
        }

        active -= 1;
        task.status = 'settled';
        task.resolve(prepared);
        if (!wanted.has(task.photo.id)) tasks.delete(task.photo.id);
        pump();
      })();
    }
  };

  const sync = (photos: readonly GalleryPhoto[]) => {
    wanted = new Map(photos.map((photo) => [photo.id, photo]));

    tasks.forEach((task, id) => {
      if (wanted.has(id) || task.status === 'running') return;
      if (task.status === 'queued') task.resolve(undefined);
      tasks.delete(id);
    });
    photos.forEach((photo) => tasks.get(photo.id) ?? createTask(photo));
    pump();
  };

  return {
    sync,

    async wait(photos: readonly GalleryPhoto[]) {
      sync(photos);
      concurrency = SUBMIT_CONCURRENCY;
      pump();

      const prepared = await Promise.all(photos.map((photo) => tasks.get(photo.id)!.promise));
      return prepared.filter((photo): photo is UploadMotionPhoto => Boolean(photo));
    },

    clear() {
      wanted.clear();
      tasks.forEach((task, id) => {
        if (task.status === 'running') return;
        if (task.status === 'queued') task.resolve(undefined);
        tasks.delete(id);
      });
    },
  };
}
