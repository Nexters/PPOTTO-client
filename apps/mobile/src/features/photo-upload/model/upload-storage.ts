import { logPhotoUpload, logPhotoUploadError } from '../lib/photo-upload-log';

import type { UploadJobEvent, UploadJobSnapshot } from './upload-job';

/*
 * 업로드 사진과 불변 스냅샷을 저장하고 이후 상태 변경을 이벤트로 기록한다.
 * 앱 종료 중 손상된 마지막 이벤트도 복구한다.
 */
export interface UploadStorageFileSystem {
  copyFile: (sourceUri: string, destinationUri: string) => Promise<void>;
  deletePathIfExists: (uri: string) => Promise<void>;
  ensureDirectory: (uri: string) => Promise<void>;
  readText: (uri: string) => Promise<string | null>;
  writeText: (uri: string, content: string, options?: { append?: boolean }) => Promise<void>;
}

export interface StoredUploadJob {
  snapshot: UploadJobSnapshot;
  events: UploadJobEvent[];
}

export interface UploadJobStorage {
  appendEvent: (event: UploadJobEvent) => Promise<void>;
  clearJob: () => Promise<void>;
  loadJob: () => Promise<StoredUploadJob | null>;
  saveJob: (snapshot: UploadJobSnapshot) => Promise<void>;
}

/** 이미지를 영속 경로에 복사한 뒤 작업을 저장하고, 이후 이벤트는 append-only로 기록한다. */
export function createUploadJobStorage(
  rootUri: string,
  fileSystem: UploadStorageFileSystem,
): UploadJobStorage {
  const root = rootUri.replace(/\/+$/, '');
  const jobUri = `${root}/job.json`;
  const eventsUri = `${root}/events.log`;
  let appendQueue = Promise.resolve();

  return {
    appendEvent(event) {
      const write = appendQueue.then(() =>
        appendWithRetry(fileSystem, eventsUri, `${JSON.stringify(event)}\n`),
      );
      appendQueue = write.catch(() => undefined);
      return write;
    },

    async clearJob() {
      logPhotoUpload('로컬 작업 정리 시작');
      await fileSystem.deletePathIfExists(jobUri);
      try {
        await fileSystem.deletePathIfExists(root);
      } catch {
        // 작업 마커가 사라졌으므로 남은 파일은 다음 saveJob에서 정리한다.
      }
      logPhotoUpload('로컬 작업 정리 완료');
    },

    async loadJob() {
      const job = await fileSystem.readText(jobUri);
      if (job === null) {
        logPhotoUpload('저장된 작업 없음');
        return null;
      }

      const storedJob = {
        snapshot: JSON.parse(job) as UploadJobSnapshot,
        events: await readAndRepairEvents(fileSystem, eventsUri),
      };
      logPhotoUpload(
        `저장된 작업 읽기 완료 (${storedJob.snapshot.jobId}, 이벤트 ${storedJob.events.length}개)`,
      );
      return storedJob;
    },

    async saveJob(snapshot) {
      if ((await fileSystem.readText(jobUri)) !== null) {
        logPhotoUploadError('작업 저장 거절', new Error('진행 중인 업로드 작업이 이미 있습니다.'));
        throw new Error('진행 중인 업로드 작업이 이미 있습니다.');
      }

      const photoCount = snapshot.groups.reduce((count, group) => count + group.items.length, 0);
      logPhotoUpload(`영속 저장 시작 (${snapshot.jobId}, ${photoCount}장)`);
      await fileSystem.deletePathIfExists(root);
      const imageDirectory = `${root}/${snapshot.jobId}`;
      await fileSystem.ensureDirectory(imageDirectory);
      const persistedSnapshot = await copyImages(imageDirectory, snapshot, fileSystem);
      await fileSystem.writeText(jobUri, JSON.stringify(persistedSnapshot));
      logPhotoUpload(`영속 저장 완료 (${snapshot.jobId})`);
    },
  };
}

async function appendWithRetry(
  fileSystem: UploadStorageFileSystem,
  eventsUri: string,
  content: string,
): Promise<void> {
  try {
    await fileSystem.writeText(eventsUri, content, { append: true });
  } catch {
    await readAndRepairEvents(fileSystem, eventsUri);
    await fileSystem.writeText(eventsUri, content, { append: true });
  }
}

async function readAndRepairEvents(
  fileSystem: UploadStorageFileSystem,
  eventsUri: string,
): Promise<UploadJobEvent[]> {
  const eventLog = parseEvents(await fileSystem.readText(eventsUri));
  if (eventLog.needsRepair) {
    await fileSystem.writeText(eventsUri, serializeEvents(eventLog.events));
  }
  return eventLog.events;
}

async function copyImages(
  imageDirectory: string,
  snapshot: UploadJobSnapshot,
  fileSystem: UploadStorageFileSystem,
): Promise<UploadJobSnapshot> {
  const groups = [];
  const total = snapshot.groups.reduce((count, group) => count + group.items.length, 0);
  let copied = 0;

  for (const group of snapshot.groups) {
    const items = [];

    for (const photo of group.items) {
      const fileName = encodeURIComponent(photo.clientPhotoId);
      const fileUri = `${imageDirectory}/${fileName}.${extensionOf(photo.contentType)}`;
      try {
        await fileSystem.copyFile(photo.fileUri, fileUri);
      } catch (error) {
        logPhotoUploadError(`파일 복사 실패 (${photo.clientPhotoId}, ${photo.fileUri})`, error);
        throw error;
      }
      items.push({ ...photo, fileUri });
      copied += 1;
      if (copied % 25 === 0 || copied === total) {
        logPhotoUpload(`파일 복사 ${copied}/${total}`);
      }
    }

    groups.push({ items });
  }

  return { ...snapshot, groups };
}

interface ParsedEvents {
  events: UploadJobEvent[];
  needsRepair: boolean;
}

function parseEvents(content: string | null): ParsedEvents {
  const lines = content?.split('\n').filter(Boolean) ?? [];
  const events: UploadJobEvent[] = [];

  for (const [index, line] of lines.entries()) {
    try {
      events.push(JSON.parse(line) as UploadJobEvent);
    } catch {
      if (index !== lines.length - 1) throw new Error('events.log가 손상되었습니다.');
      return { events, needsRepair: true };
    }
  }

  return { events, needsRepair: false };
}

function serializeEvents(events: readonly UploadJobEvent[]): string {
  return events.length === 0 ? '' : `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}

function extensionOf(
  contentType: UploadJobSnapshot['groups'][number]['items'][number]['contentType'],
) {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'heic';
}
