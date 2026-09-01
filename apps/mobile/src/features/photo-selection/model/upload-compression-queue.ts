import type { GalleryPhoto } from './gallery-photo';
import type { PhotoGroup } from './photo-group';

export type CompressUploadPhoto = (photo: GalleryPhoto) => Promise<GalleryPhoto>;

export interface UploadPhotoCompressionQueueOptions {
  backgroundConcurrency: number;
  submitConcurrency: number;
}

type TaskStatus = 'queued' | 'running' | 'settled';

interface CompressionTask {
  photo: GalleryPhoto;
  promise: Promise<GalleryPhoto>;
  resolve: (photo: GalleryPhoto) => void;
  status: TaskStatus;
}

const MAX_ATTEMPTS = 2;

export function createUploadPhotoCompressionQueue(
  compress: CompressUploadPhoto,
  { backgroundConcurrency, submitConcurrency }: UploadPhotoCompressionQueueOptions,
) {
  const wanted = new Map<string, GalleryPhoto>();
  const tasks = new Map<string, CompressionTask>();
  const results = new Map<string, GalleryPhoto>();
  const queue: CompressionTask[] = [];
  let concurrency = backgroundConcurrency;
  let activeCount = 0;

  const selectedPhotosOf = (groups: readonly PhotoGroup[]) => {
    const photos = new Map<string, GalleryPhoto>();
    for (const group of groups) {
      for (const photo of group.photos) {
        photos.set(photo.id, photo);
      }
    }
    return photos;
  };

  const runWithFallback = async (photo: GalleryPhoto) => {
    let result = photo;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        result = await compress(photo);
        break;
      } catch {
        result = photo;
      }
    }
    return result;
  };

  const pump = () => {
    while (activeCount < concurrency) {
      const task = queue.shift();
      if (!task) return;
      if (task.status !== 'queued') continue;
      if (!wanted.has(task.photo.id)) {
        tasks.delete(task.photo.id);
        task.status = 'settled';
        task.resolve(task.photo);
        continue;
      }

      task.status = 'running';
      activeCount += 1;
      void runWithFallback(task.photo)
        .then((result) => {
          results.set(task.photo.id, result);
          task.resolve(result);
        })
        .finally(() => {
          task.status = 'settled';
          activeCount -= 1;
          pump();
        });
    }
  };

  const enqueue = (photo: GalleryPhoto) => {
    if (results.has(photo.id) || tasks.has(photo.id)) return;

    let resolveTask: (photo: GalleryPhoto) => void = () => undefined;
    const task: CompressionTask = {
      photo,
      promise: new Promise<GalleryPhoto>((resolve) => {
        resolveTask = resolve;
      }),
      resolve: resolveTask,
      status: 'queued',
    };
    tasks.set(photo.id, task);
    queue.push(task);
  };

  const sync = (groups: readonly PhotoGroup[]) => {
    const nextWanted = selectedPhotosOf(groups);

    wanted.clear();
    for (const [id, photo] of nextWanted) {
      wanted.set(id, photo);
      enqueue(photo);
    }

    for (const [id, task] of tasks) {
      if (wanted.has(id) || task.status !== 'queued') continue;
      tasks.delete(id);
      task.status = 'settled';
      task.resolve(task.photo);
    }

    pump();
  };

  const wait = async (groups: readonly PhotoGroup[]) => {
    sync(groups);
    concurrency = submitConcurrency;
    pump();

    const finalPhotos = selectedPhotosOf(groups);
    const compressedPhotos = new Map<string, GalleryPhoto>();

    await Promise.all(
      [...finalPhotos].map(async ([id, photo]) => {
        const cached = results.get(id);
        if (cached) {
          compressedPhotos.set(id, cached);
          return;
        }

        const task = tasks.get(id);
        compressedPhotos.set(id, task ? await task.promise : photo);
      }),
    );

    return compressedPhotos;
  };

  const clear = () => {
    wanted.clear();
    queue.length = 0;
    concurrency = backgroundConcurrency;

    for (const [id, task] of tasks) {
      if (task.status !== 'queued') continue;
      tasks.delete(id);
      task.status = 'settled';
      task.resolve(task.photo);
    }

    results.clear();
  };

  return {
    clear,
    sync,
    wait,
  };
}
