import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface QaScreenRecordingClip {
  uri: string;
  size: number;
}

interface QaScreenRecorderNativeModule {
  startBuffering(): Promise<void>;
  exportLastClip(): Promise<QaScreenRecordingClip>;
  compressVideo(uri: string, maxBytes: number): Promise<QaScreenRecordingClip>;
  stopBuffering(): Promise<void>;
}

let recorder: QaScreenRecorderNativeModule | undefined;
let recorderQueue: Promise<unknown> = Promise.resolve();

function requireRecorder() {
  if (Platform.OS !== 'ios') throw new Error('QA screen recording is only available on iOS');
  recorder ??= requireNativeModule<QaScreenRecorderNativeModule>('QaScreenRecorder');
  return recorder;
}

function enqueueRecorderOperation<T>(operation: () => Promise<T>) {
  const result = recorderQueue.then(operation, operation);
  recorderQueue = result.catch(() => undefined);
  return result;
}

export const startBuffering = () =>
  enqueueRecorderOperation(() => requireRecorder().startBuffering());
export const restartBuffering = () =>
  enqueueRecorderOperation(async () => {
    const nativeRecorder = requireRecorder();
    try {
      await nativeRecorder.stopBuffering();
    } catch {
      // ReplayKit may already have discarded the session in the background.
    }
    await nativeRecorder.startBuffering();
  });
export const exportLastClip = () =>
  enqueueRecorderOperation(() => requireRecorder().exportLastClip());
export const compressVideo = (uri: string, maxBytes: number) =>
  requireRecorder().compressVideo(uri, maxBytes);
export const stopBuffering = () =>
  enqueueRecorderOperation(() => requireRecorder().stopBuffering());
