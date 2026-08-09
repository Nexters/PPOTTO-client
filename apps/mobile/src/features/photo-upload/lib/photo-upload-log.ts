const enabled = __DEV__ && process.env.NODE_ENV !== 'test';

export function logPhotoUpload(message: string, ...details: unknown[]) {
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.log(`[photo-upload] ${message}`, ...details);
}

export function logPhotoUploadError(message: string, error: unknown) {
  if (!enabled) return;
  console.error(`[photo-upload] ${message}`, error);
}
