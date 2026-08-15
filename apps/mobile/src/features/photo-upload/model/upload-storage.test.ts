/**
 * 업로드 작업의 디스크 영속화 시나리오
 * - 압축 이미지를 작업 디렉터리에 저장 → 임시 이미지가 사라져도 새 storage에서 읽기
 * - 작업과 ANALYSIS_CREATED 이벤트 저장 → 새 storage에서 분석 ID와 사진 ID 매핑 복구
 * - 새 작업 저장 → 이전 작업의 이벤트와 이미지 잔재 제거
 * - 진행 중인 작업 존재 → 새 작업으로 덮어쓰지 않음
 * - 작업 정리 → job, 이벤트, 이미지 전체 제거
 * - 작업 마커 삭제 후 잔여 파일 정리 실패 → 작업 삭제는 성공 처리
 * - 마지막 이벤트가 깨짐 → 정상 이벤트 복구 후 새 이벤트 계속 저장
 * - 이벤트 저장 실패 → 1회 재시도하고, 최종 실패 후에도 다음 저장 수행
 * - 이벤트가 일부 기록된 뒤 실패 → 깨진 조각을 제거하고 재시도
 * - 동시 이벤트 저장 → 호출 순서대로 직렬 기록
 * - 이미지 저장 → 필요한 부모 디렉터리를 먼저 생성
 */
import { restoreUploadJob, type UploadJobEvent, type UploadJobSnapshot } from './upload-job';
import { createUploadJobStorage, type UploadStorageFileSystem } from './upload-storage';

const ROOT_URI = 'document:///photo-upload';
const EVENTS_URI = `${ROOT_URI}/events.log`;

function snapshot(): UploadJobSnapshot {
  return {
    jobId: 'job-1',
    boardId: 'board-1',
    groups: [
      {
        items: [
          {
            clientPhotoId: 'local-a',
            fileUri: 'cache:///a.jpg',
            contentType: 'image/webp',
            takenAt: '2026-08-09T00:00:00.000Z',
            isRepresentative: true,
          },
          {
            clientPhotoId: 'local-b',
            fileUri: 'cache:///b.jpg',
            contentType: 'image/jpeg',
            takenAt: '2026-08-09T00:01:00.000Z',
            isRepresentative: false,
          },
        ],
      },
    ],
  };
}

function fakeFileSystem(
  initialFiles: Record<string, string>,
  options: { requireDestinationDirectory?: boolean } = {},
) {
  const files = new Map(Object.entries(initialFiles));
  const directories = new Set<string>();
  const fileSystem: jest.Mocked<UploadStorageFileSystem> = {
    copyFile: jest.fn(async (sourceUri, destinationUri) => {
      const content = files.get(sourceUri);
      if (content === undefined) throw new Error(`Missing file: ${sourceUri}`);
      const parentUri = destinationUri.slice(0, destinationUri.lastIndexOf('/'));
      if (options.requireDestinationDirectory && !directories.has(parentUri)) {
        throw new Error(`Missing directory: ${parentUri}`);
      }
      files.set(destinationUri, content);
    }),
    deletePathIfExists: jest.fn(async (uri) => {
      for (const path of files.keys()) {
        if (path === uri || path.startsWith(`${uri}/`)) files.delete(path);
      }
      for (const path of directories) {
        if (path === uri || path.startsWith(`${uri}/`)) directories.delete(path);
      }
    }),
    ensureDirectory: jest.fn(async (uri) => {
      directories.add(uri);
    }),
    readText: jest.fn(async (uri) => files.get(uri) ?? null),
    writeText: jest.fn(async (uri, content, options) => {
      files.set(uri, options?.append ? `${files.get(uri) ?? ''}${content}` : content);
    }),
  };

  return { files, fileSystem };
}

it('임시 이미지가 사라진 뒤에도 저장된 작업의 이미지를 읽을 수 있다', async () => {
  const { files, fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });
  await createUploadJobStorage(ROOT_URI, fileSystem).saveJob(snapshot());

  files.delete('cache:///a.jpg');
  files.delete('cache:///b.jpg');
  const restored = await createUploadJobStorage(ROOT_URI, fileSystem).loadJob();
  const restoredPhotos = restored!.snapshot.groups.flatMap((group) => group.items);

  expect(restoredPhotos.map((photo) => files.get(photo.fileUri))).toEqual(['image-a', 'image-b']);
});

it('사진 ID의 경로 구분자를 파일명으로 인코딩한다', async () => {
  const job = snapshot();
  job.groups[0]!.items[0]!.clientPhotoId = 'local-a/L0/001';
  const { fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });

  await createUploadJobStorage(ROOT_URI, fileSystem).saveJob(job);

  expect(fileSystem.copyFile).toHaveBeenCalledWith(
    'cache:///a.jpg',
    `${ROOT_URI}/job-1/local-a%2FL0%2F001.webp`,
  );
});

it('새 storage 인스턴스에서 분석 ID와 사진 ID 매핑을 복구한다', async () => {
  const { fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });
  const storage = createUploadJobStorage(ROOT_URI, fileSystem);
  const analysisCreated: UploadJobEvent = {
    type: 'ANALYSIS_CREATED',
    analysisId: 'analysis-1',
    photoIds: { 'local-a': 'server-a', 'local-b': 'server-b' },
  };
  await storage.saveJob(snapshot());
  await storage.appendEvent(analysisCreated);

  const restored = await createUploadJobStorage(ROOT_URI, fileSystem).loadJob();
  const state = restoreUploadJob(restored!.snapshot, restored!.events);

  expect(state.phase).toBe('PUTTING');
  expect(state.analysisId).toBe('analysis-1');
  expect(state.photoIds).toEqual({ 'local-a': 'server-a', 'local-b': 'server-b' });
});

it('새 작업을 저장하면 이전 작업의 이벤트와 이미지 잔재를 제거한다', async () => {
  const oldEvent: UploadJobEvent = {
    type: 'ANALYSIS_CREATED',
    analysisId: 'old-analysis',
    photoIds: { 'old-local': 'old-server' },
  };
  const { files, fileSystem } = fakeFileSystem({
    [EVENTS_URI]: `${JSON.stringify(oldEvent)}\n`,
    [`${ROOT_URI}/old-job/old-local.jpg`]: 'old-image',
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });

  await createUploadJobStorage(ROOT_URI, fileSystem).saveJob(snapshot());
  const restored = await createUploadJobStorage(ROOT_URI, fileSystem).loadJob();

  expect(restored!.snapshot.jobId).toBe('job-1');
  expect(restored!.events).toEqual([]);
  expect(files.has(`${ROOT_URI}/old-job/old-local.jpg`)).toBe(false);
});

it('진행 중인 작업이 있으면 새 작업으로 덮어쓰지 않는다', async () => {
  const { fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });
  const storage = createUploadJobStorage(ROOT_URI, fileSystem);
  await storage.saveJob(snapshot());

  await expect(storage.saveJob({ ...snapshot(), jobId: 'job-2' })).rejects.toThrow(
    '진행 중인 업로드 작업이 이미 있습니다.',
  );
  expect((await storage.loadJob())!.snapshot.jobId).toBe('job-1');
});

it('clearJob을 호출하면 작업과 이벤트와 이미지를 모두 제거한다', async () => {
  const { files, fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });
  const storage = createUploadJobStorage(ROOT_URI, fileSystem);
  await storage.saveJob(snapshot());
  await storage.appendEvent({ type: 'PHOTO_UPLOADED', photoId: 'server-a' });

  await storage.clearJob();

  expect(await createUploadJobStorage(ROOT_URI, fileSystem).loadJob()).toBeNull();
  expect([...files.keys()].filter((path) => path.startsWith(ROOT_URI))).toEqual([]);
});

it('작업 마커를 지운 뒤 잔여 파일 정리가 실패해도 작업 삭제는 완료된다', async () => {
  const { fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });
  const storage = createUploadJobStorage(ROOT_URI, fileSystem);
  await storage.saveJob(snapshot());
  const deletePathIfExists = fileSystem.deletePathIfExists.getMockImplementation()!;
  fileSystem.deletePathIfExists.mockImplementation(async (uri) => {
    if (uri === ROOT_URI) throw new Error('cleanup failed');
    await deletePathIfExists(uri);
  });

  await expect(storage.clearJob()).resolves.toBeUndefined();
  expect(await storage.loadJob()).toBeNull();
});

it('마지막 이벤트가 깨져도 정상 이벤트를 복구하고 새 이벤트를 이어서 저장한다', async () => {
  const { files, fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });
  const analysisCreated: UploadJobEvent = {
    type: 'ANALYSIS_CREATED',
    analysisId: 'analysis-1',
    photoIds: { 'local-a': 'server-a', 'local-b': 'server-b' },
  };
  const storage = createUploadJobStorage(ROOT_URI, fileSystem);
  await storage.saveJob(snapshot());
  await storage.appendEvent(analysisCreated);
  files.set(EVENTS_URI, `${files.get(EVENTS_URI)}{"type":"PHOTO_UPLO`);

  const restoredStorage = createUploadJobStorage(ROOT_URI, fileSystem);
  expect((await restoredStorage.loadJob())!.events).toEqual([analysisCreated]);

  const uploaded: UploadJobEvent = { type: 'PHOTO_UPLOADED', photoId: 'server-a' };
  await restoredStorage.appendEvent(uploaded);

  expect((await createUploadJobStorage(ROOT_URI, fileSystem).loadJob())!.events).toEqual([
    analysisCreated,
    uploaded,
  ]);
});

it('이벤트 저장을 한 번 재시도하고 최종 실패 후에도 다음 이벤트를 저장한다', async () => {
  const { fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });
  const storage = createUploadJobStorage(ROOT_URI, fileSystem);
  await storage.saveJob(snapshot());
  fileSystem.writeText.mockClear();

  const uploadedA: UploadJobEvent = { type: 'PHOTO_UPLOADED', photoId: 'server-a' };
  const uploadedB: UploadJobEvent = { type: 'PHOTO_UPLOADED', photoId: 'server-b' };
  const startRequested: UploadJobEvent = { type: 'START_REQUESTED' };

  fileSystem.writeText.mockRejectedValueOnce(new Error('temporary'));
  await expect(storage.appendEvent(uploadedA)).resolves.toBeUndefined();

  fileSystem.writeText
    .mockRejectedValueOnce(new Error('disk'))
    .mockRejectedValueOnce(new Error('disk'));
  await expect(storage.appendEvent(uploadedB)).rejects.toThrow('disk');
  await expect(storage.appendEvent(startRequested)).resolves.toBeUndefined();

  expect((await createUploadJobStorage(ROOT_URI, fileSystem).loadJob())!.events).toEqual([
    uploadedA,
    startRequested,
  ]);
});

it('이벤트가 일부 기록된 뒤 실패하면 깨진 조각을 제거하고 재시도한다', async () => {
  const { files, fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });
  const storage = createUploadJobStorage(ROOT_URI, fileSystem);
  await storage.saveJob(snapshot());
  fileSystem.writeText.mockImplementationOnce(async (uri, content) => {
    files.set(uri, `${files.get(uri) ?? ''}${content.slice(0, 20)}`);
    throw new Error('partial write');
  });

  const uploaded: UploadJobEvent = { type: 'PHOTO_UPLOADED', photoId: 'server-a' };
  const startRequested: UploadJobEvent = { type: 'START_REQUESTED' };
  await storage.appendEvent(uploaded);
  await storage.appendEvent(startRequested);

  expect((await createUploadJobStorage(ROOT_URI, fileSystem).loadJob())!.events).toEqual([
    uploaded,
    startRequested,
  ]);
});

it('동시에 요청된 이벤트를 호출 순서대로 직렬 저장한다', async () => {
  const { files, fileSystem } = fakeFileSystem({
    'cache:///a.jpg': 'image-a',
    'cache:///b.jpg': 'image-b',
  });
  const storage = createUploadJobStorage(ROOT_URI, fileSystem);
  await storage.saveJob(snapshot());

  let releaseFirstWrite!: () => void;
  let markFirstWriteStarted!: () => void;
  const firstWriteStarted = new Promise<void>((resolve) => {
    markFirstWriteStarted = resolve;
  });
  const waitForRelease = new Promise<void>((resolve) => {
    releaseFirstWrite = resolve;
  });
  let writeIndex = 0;
  fileSystem.writeText.mockImplementation(async (uri, content, options) => {
    if (writeIndex++ === 0) {
      markFirstWriteStarted();
      await waitForRelease;
    }
    files.set(uri, options?.append ? `${files.get(uri) ?? ''}${content}` : content);
  });

  const events: UploadJobEvent[] = [
    { type: 'PHOTO_UPLOADED', photoId: 'server-a' },
    { type: 'PHOTO_UPLOADED', photoId: 'server-b' },
    { type: 'START_REQUESTED' },
  ];
  const writes = events.map((event) => storage.appendEvent(event));
  await firstWriteStarted;
  await Promise.resolve();
  releaseFirstWrite();
  await Promise.all(writes);

  expect((await createUploadJobStorage(ROOT_URI, fileSystem).loadJob())!.events).toEqual(events);
});

it('이미지를 저장할 부모 디렉터리를 먼저 생성한다', async () => {
  const { fileSystem } = fakeFileSystem(
    {
      'cache:///a.jpg': 'image-a',
      'cache:///b.jpg': 'image-b',
    },
    { requireDestinationDirectory: true },
  );

  await expect(
    createUploadJobStorage(ROOT_URI, fileSystem).saveJob(snapshot()),
  ).resolves.toBeUndefined();
});
