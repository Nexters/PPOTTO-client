import { Directory, File, Paths } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';

import type { UploadStorageFileSystem } from '../model/upload-storage';

export const PHOTO_UPLOAD_ROOT_URI = new Directory(Paths.document, 'photo-upload').uri;
export const ANALYSIS_LOADING_PHASE_URI = new File(Paths.document, 'analysis-loading-phase.txt')
  .uri;

export const expoUploadFileSystem: UploadStorageFileSystem = {
  async copyFile(sourceUri, destinationUri) {
    await copyAsync({ from: sourceUri, to: destinationUri });
  },

  async deletePathIfExists(uri) {
    const { exists, isDirectory } = Paths.info(uri);
    if (!exists) return;

    if (isDirectory) new Directory(uri).delete();
    else new File(uri).delete();
  },

  async ensureDirectory(uri) {
    new Directory(uri).create({ idempotent: true, intermediates: true });
  },

  async readText(uri) {
    const file = new File(uri);
    return file.exists ? file.text() : null;
  },

  async writeText(uri, content, options) {
    new File(uri).write(content, options);
  },
};
