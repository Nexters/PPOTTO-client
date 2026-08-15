import type { UploadMotionPhoto } from '../photo-upload-service';

const MAX_MOTION_PHOTOS = 25;

/** 한 로딩 세션에서 끝까지 사용할 사진 풀을 한 번만 고정한다. */
export function sampleMotionPhotos<T extends UploadMotionPhoto>(
  photos: readonly T[],
  random: () => number = Math.random,
) {
  const shuffled = [...photos];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled.slice(0, MAX_MOTION_PHOTOS);
}
